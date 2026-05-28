---
title: "Why more GPUs is not enough for LLM inference"
description: "What I learned deploying and tuning large-model inference: KV cache, routing, and cache hierarchy matter as much as raw GPU count."
date: 2026-05-28
draft: false
---

I went down the road of deploying [DeepSeek V4 Flash](https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4) on dedicated inference infrastructure to understand what it really takes to serve, tune, and scale a model deployment with great performance.

## The biggest learning

KV cache is not an implementation detail. It becomes stateful infrastructure when you want to do LLM serving seriously.

At a small scale, it is easy to think mostly in terms of GPUs, VRAM, batching, and tokens per second. But once you start optimizing for long context, high throughput, and low TTFT (Time to First Token), you start thinking in cache domains: who owns the KV, how do requests route back to it, and what happens when the owner is overloaded?

## From H200 to B200

I first served the model on H200 GPUs with `DP=1`. [DP, or data parallelism](https://docs.sglang.io/docs/advanced_features/dp_dpa_smg_guide), is how serving systems split requests across multiple parallel replicas or workers. With `DP=1`, there was only one DP cache domain, so prefix-cache behavior was easier to reason about.

LPM scheduling helped here. LPM stands for longest prefix match: instead of serving everything strictly first-come-first-served, the scheduler groups waiting requests with shared prefixes closer together. This is especially useful for agent workloads, where steps often repeat the same system prompt, tool schemas, policies, memory, workspace context, repository context, and previous trajectory. Each step may only add a small amount of new information while most of the prefix stays the same.

LPM helped me reach an acceptable cache-hit ratio even while the traffic still lacked proper replica-level cache locality. But LPM is a scheduler, not a routing layer. It can improve reuse inside the cache domain it sees, but it cannot make separate DP-replica caches behave like one shared cache.

For long-context inference, VRAM becomes the first bottleneck before compute. So I leaned on [SGLang HiCache](https://docs.sglang.io/docs/advanced_features/hicache_design#hicache-system-design-and-optimization) as an L2 layer, using host memory to extend KV capacity beyond GPU memory. On that node, this meant leveraging hundreds of gigabytes of host RAM instead of treating HBM as the only cache tier.

Then I moved to modern B200s with `DP=4`. Throughput improved, but cache behavior changed: each DP replica owned a separate KV-cache domain. The same prefix could hit on one replica and miss on another, even with LPM enabled, because LPM was local to each replica's cache.

The important part is not H200 versus B200 as hardware. A B200 setup with `DP=1` would not behave this way, and an H200 setup with `DP=4` would. The topology changed: `DP=4` creates four cache owners, not one bigger shared cache.

<figure class="inference-viz viz-dp" data-inference-viz="dp" aria-label="DP replicas create separate KV cache domains">
  <figcaption>Each DP replica owns a separate KV cache domain.</figcaption>
  <div class="viz-dp__grid" aria-hidden="true">
    <div class="viz-card viz-card--wide">
      <span class="viz-kicker">H200</span>
      <strong>DP=1</strong>
      <span>one replica</span>
      <div class="viz-cache-domain">
        <span class="viz-cache-dot"></span>
        <span class="viz-cache-dot"></span>
        <span class="viz-cache-dot"></span>
      </div>
      <small>one domain</small>
    </div>
    <div class="viz-card viz-card--wide">
      <span class="viz-kicker">B200</span>
      <strong>DP=4</strong>
      <span>four replicas</span>
      <div class="viz-rank-row">
        <span class="viz-rank">rep 0</span>
        <span class="viz-rank">rep 1</span>
        <span class="viz-rank is-hot">rep 2</span>
        <span class="viz-rank">rep 3</span>
      </div>
      <small>four domains</small>
    </div>
  </div>
</figure>

## The routing problem

At first, I approached it like a normal load-balancing problem: add a router, improve cache locality. But the router only saw one SGLang worker. The real cache domains were inside that worker, across DP replicas. Worker-level routing was not enough.

What I needed was replica-level cache stickiness.

The fix was simple but important: hash a stable routing key, pick the DP replica that owns the cache, then send `routed_dp_rank` with the request. For chat, the key can be tenant plus conversation ID. For agents, tenant plus session ID. For coding workloads, tenant plus repository ID or workspace ID.

In an OpenAI-compatible request, the extra routing field can be passed alongside the normal completion payload. For example, to force rank 0:

```sh
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-v4-flash",
    "messages": [
      {"role": "system", "content": "You are a concise debugging assistant."},
      {"role": "user", "content": "We are investigating high TTFT in the inference service."},
      {"role": "assistant", "content": "The first thing I would check is prefix-cache hit rate by worker."},
      {"role": "user", "content": "Continue from there."}
    ],
    "routed_dp_rank": 0
  }'
```

The goal is simple: same prefix, same cache owner. If a conversation warms DP replica 2, future turns should go back to DP replica 2.

<figure class="inference-viz viz-route" data-inference-viz="route" aria-label="Router accepts a request and forwards it to a stable DP replica">
  <figcaption>Replica-level stickiness makes the router choose the cache owner, not just the worker.</figcaption>
  <div class="viz-route__flow" aria-hidden="true">
    <div class="viz-node">
      <span class="viz-kicker">request</span>
      <strong>session</strong>
      <small>stable key</small>
    </div>
    <div class="viz-link"><span class="viz-packet"></span></div>
    <div class="viz-node viz-node--router">
      <span class="viz-kicker">router</span>
      <strong>hash key</strong>
      <small>pick replica</small>
    </div>
    <div class="viz-link"><span class="viz-packet viz-packet--late"></span></div>
    <div class="viz-node viz-node--gpu">
      <span class="viz-kicker">gpu node</span>
      <strong>replica 2</strong>
      <small>KV owner</small>
    </div>
  </div>
  <div class="viz-rank-strip" aria-hidden="true">
    <span>replica 0</span>
    <span>replica 1</span>
    <span class="is-hot">replica 2</span>
    <span>replica 3</span>
  </div>
</figure>

After combining LPM, a better cache hierarchy, and replica-level stickiness, I raised the cache hit ratio from roughly 0-60% to a stable 90%.

## The caveat

Replica stickiness improves cache locality, but it does not solve everything. It does not account for GPU utilization, overloaded replicas, unhealthy workers, failover, or tail latency.

A production routing layer still needs to balance cache ownership against real-time load and availability: route to the cache owner when possible, but fall back when that owner is too busy or unavailable.

### The better production shape

I did not deploy SMG for this experiment, but it is the cleaner production shape: run [SGLang Model Gateway (SMG)](https://docs.sglang.io/docs/advanced_features/dp_dpa_smg_guide) in cache-aware mode. Instead of manually hashing to a replica, SMG can route by prefix locality while still accounting for load, health, retries, and observability.

<figure class="inference-viz viz-smg" data-inference-viz="smg" aria-label="SGLang Model Gateway routes requests with cache-aware policy">
  <figcaption>SMG is the routing layer: it scores workers, then sends the request to the best cache owner.</figcaption>
  <div class="viz-smg__board" aria-hidden="true">
    <div class="viz-smg__request">
      <span class="viz-kicker">incoming</span>
      <strong>prefix</strong>
      <small>session</small>
    </div>
    <div class="viz-router-core">
      <span class="viz-kicker">SMG</span>
      <strong>cache_aware</strong>
      <small>prefix + load</small>
    </div>
    <div class="viz-smg__signals">
      <span class="viz-stat">prefix tree</span>
    <span class="viz-stat">queue</span>
    <span class="viz-stat">health</span>
      <span class="viz-stat">fallback</span>
    </div>
    <div class="viz-smg__workers">
      <div class="viz-worker">
        <span>worker 0</span>
        <small>cold</small>
      </div>
      <div class="viz-worker is-selected">
        <span>worker 1</span>
        <small>best match</small>
      </div>
      <div class="viz-worker">
        <span>worker 2</span>
        <small>busy</small>
      </div>
    </div>
  </div>
</figure>

## The cache hierarchy

The broader pattern I learned is that serious LLM serving needs a KV hierarchy:

1. **L1:** GPU KV cache
2. **L2:** host-memory KV cache via HiCache
3. **L3:** shared or distributed KV cache with something like [Mooncake](https://kvcache-ai.github.io/Mooncake/), as used by Kimi

<figure class="inference-viz viz-cache" data-inference-viz="cache" aria-label="KV cache hierarchy from GPU memory to distributed cache">
  <figcaption>Cache hits should stay as high in the hierarchy as possible.</figcaption>
  <div class="viz-cache__stack" aria-hidden="true">
    <div class="viz-tier viz-tier--l1">
      <span class="viz-kicker">L1</span>
      <strong>GPU KV</strong>
      <small>fast</small>
    </div>
    <div class="viz-cache__arrow">then</div>
    <div class="viz-tier viz-tier--l2">
      <span class="viz-kicker">L2</span>
      <strong>Host RAM</strong>
      <small>larger</small>
    </div>
    <div class="viz-cache__arrow">then</div>
    <div class="viz-tier viz-tier--l3">
      <span class="viz-kicker">L3</span>
      <strong>Shared KV</strong>
      <small>shared</small>
    </div>
  </div>
</figure>

L1 is fastest, but limited by GPU memory. L2 extends local KV capacity into host memory. L3 becomes important when KV cache needs to be shared across workers or nodes to maximize cache hits.

I also tried different speculative decoding strategies to improve latency. The idea is to draft several likely next tokens cheaply, then let the main model verify them. When acceptance is good, you skip multiple expensive decode steps and improve latency and throughput. In practice, it becomes another [tuning surface](https://github.com/supa-thibaud/sglang-dry/blob/main/docs/en/hyperparameter_tuning.md): draft length, number of speculative steps, acceptance rate, draft model quality, and workload shape all matter.

## The next scaling lever

Once caching is working well across the serving layer, the next scaling lever is splitting prefill from decode.

I left this out of the initial experiment because it is a bigger infrastructure change than replica stickiness or cache tuning. The serving system has to coordinate separate pools and move KV state between them efficiently.

Prefill is compute-heavy, especially for large contexts. Decode is latency-sensitive and KV-cache-heavy. Keeping them in the same pool means long prefills can interfere with active streams.

Separating them lets you scale each side independently: more prefill capacity when prompts get long, more decode capacity when concurrency rises. The main catch is that KV state has to move efficiently from the prefill side to the decode side.

<figure class="inference-viz viz-split" data-inference-viz="split" aria-label="Prefill and decode run as separate pools">
  <figcaption>Prefill and decode want different scaling knobs.</figcaption>
  <div class="viz-split__flow" aria-hidden="true">
    <div class="viz-step">
      <span class="viz-kicker">context</span>
      <strong>prompt</strong>
      <div class="viz-token-bar"><span></span><span></span><span></span><span></span></div>
    </div>
    <div class="viz-link"><span class="viz-packet"></span></div>
    <div class="viz-pool viz-pool--prefill">
      <span class="viz-kicker">prefill</span>
      <strong>compute</strong>
      <small>build KV</small>
    </div>
    <div class="viz-link"><span class="viz-packet viz-packet--late"></span></div>
    <div class="viz-pool viz-pool--decode">
      <span class="viz-kicker">decode</span>
      <strong>latency</strong>
      <small>stream tokens</small>
    </div>
  </div>
</figure>

The practical win is isolation: one user with a huge context window is much less likely to slow down everyone else's quick requests.

## The result

At the end of this setup, the experiment served 600M production tokens with a P50 TTFT under 2 seconds and a generation rate of around 100 tokens per second.

I call that a success.

The current pricing wars make it even harder to justify running models yourself purely from an economic perspective. But understanding what it takes to run and [benchmark these models](https://github.com/sgl-project/sglang/blob/main/docs/developer_guide/bench_serving.md) at scale, and what good performance actually means, taught me a lot.

A big shoutout to the SGLang team as well. The software and documentation made it possible to explore this deeply: DP attention, LPM, HiCache, speculative decoding, and the many small serving knobs that matter when running current OSS models in production.

Open-source infrastructure like this is what makes serious model serving experimentation possible. The real lesson: scaling LLM inference is not just adding more GPUs. It is model parallelism, data parallelism, routing, cache hierarchy, speculative decoding, prefill/decode disaggregation, and observability.

If you want high throughput and low TTFT with growing demand, the KV cache has to become a backbone part of your serving architecture.

<div class="post-references" aria-label="References">
  <span>references</span>
  <a href="https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4">SGLang DeepSeek V4 cookbook</a>
  <a href="https://docs.sglang.io/docs/advanced_features/dp_dpa_smg_guide">SGLang DP/DPA guide</a>
  <a href="https://github.com/sgl-project/sglang/blob/main/docs/developer_guide/bench_serving.md">SGLang serving benchmark guide</a>
  <a href="https://docs.sglang.io/docs/advanced_features/hicache_design#hicache-system-design-and-optimization">SGLang HiCache design</a>
  <a href="https://kvcache-ai.github.io/Mooncake/">Mooncake KV cache</a>
  <a href="https://github.com/supa-thibaud/sglang-dry/blob/main/docs/en/hyperparameter_tuning.md">SGLang hyperparameter tuning notes</a>
</div>
