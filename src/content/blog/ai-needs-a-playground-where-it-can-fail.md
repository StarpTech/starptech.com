---
title: "AI needs a playground where it can fail"
description: "Agents are now good enough to prove their own work end to end. What most teams are missing isn't a better model. It's the foundations: a safe, full-stack place where the agent is allowed to break things."
category: "Engineering practice"
date: 2026-10-04
draft: false
---

Since GPT-5.6, my development workflow has changed significantly. The surprising part is where that change came from. It didn't come from the model writing better code, although it does. It came from the model getting good at *proving* that the code works.

That ability isn't worth much on its own, though. A model can only prove its work if it has somewhere to run it: a real environment, with real services, real data, and room to break things. Most companies don't have that. I think that's the real bottleneck in AI-assisted engineering right now, and fixing it is foundational work, not model work.

## The confidence gap

Before, my loop looked like most people's. The agent implemented a feature and generated tests, and then I clicked through the app myself to confirm my expectations.

In a small codebase, that's fine. In a complex application, it never gave me the confidence I needed.

The generated tests had a structural problem. The same model wrote the code and the tests, from the same understanding of the problem. If it misunderstood how invitations interact with permissions, the tests encoded the same misunderstanding and passed. The model was grading its own homework.

My manual click-through had the opposite problem. It touched the real system, but only the happy path, only once, and it left nothing behind. Two days later, I couldn't tell you what I had actually checked.

<figure class="inference-viz viz-matrix" data-inference-viz="matrix" aria-label="Comparison of generated tests, manual click-through, and agent-proven end-to-end tests">
  <figcaption>Where confidence actually comes from.</figcaption>
  <div class="viz-matrix__grid" role="table">
    <div class="viz-matrix__row viz-matrix__row--head" role="row">
      <span role="columnheader">approach</span>
      <span role="columnheader">real stack</span>
      <span role="columnheader">repeatable</span>
      <span role="columnheader">evidence</span>
    </div>
    <div class="viz-matrix__row" role="row">
      <span role="cell"><strong>generated tests</strong><small>checks the code against itself</small></span>
      <span role="cell" class="viz-mark is-no" aria-label="no"></span>
      <span role="cell" class="viz-mark is-yes" aria-label="yes"></span>
      <span role="cell" class="viz-mark is-no" aria-label="no"></span>
    </div>
    <div class="viz-matrix__row" role="row">
      <span role="cell"><strong>manual click-through</strong><small>happy path, once</small></span>
      <span role="cell" class="viz-mark is-yes" aria-label="yes"></span>
      <span role="cell" class="viz-mark is-no" aria-label="no"></span>
      <span role="cell" class="viz-mark is-no" aria-label="no"></span>
    </div>
    <div class="viz-matrix__row is-hot" role="row">
      <span role="cell"><strong>agent-proven e2e</strong><small>drives the system, keeps receipts</small></span>
      <span role="cell" class="viz-mark is-yes" aria-label="yes"></span>
      <span role="cell" class="viz-mark is-yes" aria-label="yes"></span>
      <span role="cell" class="viz-mark is-yes" aria-label="yes"></span>
    </div>
  </div>
</figure>

What I was missing were real, fully fledged end-to-end tests: run against the actual stack, repeatable, and leaving evidence behind. I believe most companies aren't prepared for them. They aren't especially hard to write. The problem is that the environment to run them in doesn't exist.

## Let the agent prove it

So I changed the order. Now the agent runs end-to-end tests against our API before anything else happens, in two ways: automated, as an API consumer, and as a real user clicking through the app in a browser.

Along the way, it collects proof: database state, logs, metrics, UI screenshots. Only after I've reviewed that evidence does it generate the tests.

<figure class="inference-viz viz-loop" data-inference-viz="loop" aria-label="The prove-first loop: build, run, prove, collect, codify">
  <figcaption>Prove first. Codify second.</figcaption>
  <ol class="viz-loop__steps">
    <li class="viz-loop__step">
      <span class="viz-loop__index">01</span>
      <div><strong>build</strong><small>agent implements the change in its worktree</small></div>
    </li>
    <li class="viz-loop__step">
      <span class="viz-loop__index">02</span>
      <div><strong>run</strong><small>spins up its own full-stack environment</small></div>
    </li>
    <li class="viz-loop__step is-hot">
      <span class="viz-loop__index">03</span>
      <div><strong>prove</strong><small>calls the API as a consumer, clicks the UI as a user</small></div>
    </li>
    <li class="viz-loop__step">
      <span class="viz-loop__index">04</span>
      <div><strong>collect</strong><small>db state · logs · metrics · screenshots</small></div>
    </li>
    <li class="viz-loop__retry" aria-label="If a gap is found, go back to build">
      <span aria-hidden="true">↺</span> gap found → back to 01
    </li>
    <li class="viz-loop__step viz-loop__step--final">
      <span class="viz-loop__index">05</span>
      <div><strong>codify</strong><small>turn what was proven into tests</small></div>
    </li>
  </ol>
</figure>

That last step matters more than it looks. Tests written after the proof aren't guesses about how the system should behave. They record how it *did* behave, checked against the real thing. What it proved stays proven.

## Evidence, not a green checkmark

The output of this loop isn't a passing test run. It's a receipt: a claim, plus the observations that back it up across every layer the feature touches.

<figure class="inference-viz viz-receipt" data-inference-viz="receipt" aria-label="Example evidence receipt for an invite feature">
  <figcaption>An evidence receipt, illustrative.</figcaption>
  <div class="viz-receipt__paper">
    <div class="viz-receipt__claim">
      <span class="viz-kicker">claim</span>
      <strong>"An invited teammate can accept and join the workspace."</strong>
    </div>
    <div class="viz-receipt__rows">
      <div class="viz-receipt__row"><span class="viz-receipt__src">api</span><span>POST /invites → 201</span><span class="viz-receipt__ok">✓</span></div>
      <div class="viz-receipt__row"><span class="viz-receipt__src">db</span><span>invite pending → accepted</span><span class="viz-receipt__ok">✓</span></div>
      <div class="viz-receipt__row"><span class="viz-receipt__src">ui</span><span>new member in list, screenshot</span><span class="viz-receipt__ok">✓</span></div>
      <div class="viz-receipt__row"><span class="viz-receipt__src">logs</span><span>invite.accepted, 0 errors</span><span class="viz-receipt__ok">✓</span></div>
      <div class="viz-receipt__row"><span class="viz-receipt__src">metrics</span><span>accept latency within budget</span><span class="viz-receipt__ok">✓</span></div>
      <div class="viz-receipt__row is-finding"><span class="viz-receipt__src">api</span><span>replay accept → 200, expected 409</span><span class="viz-receipt__flag">!</span></div>
    </div>
    <div class="viz-receipt__verdict">
      <span>5 proven</span>
      <span class="viz-receipt__verdict-flag">1 open question</span>
    </div>
  </div>
</figure>

This alone is gold. Reviewing an AI-generated change with a receipt like this is a completely different experience from reading a diff and hoping. I'm no longer asking "does this look right?" I'm asking "is this evidence sufficient?", and that's a question I can actually answer.

New models are insanely good at this. Give them the means to observe a system, and they go to considerable lengths to *show* you what happened instead of telling you.

## The side effect: it questions the concept

Look at the last row of that receipt. To prove that an invite can be accepted, the agent had to think about what "accepting" means, including whether it should be possible to do it twice.

This is the side effect I didn't expect. While agents test, they question the concepts around the feature. They find the race, the missing state transition, the permission that only makes sense on the happy path. These are issues you would usually never have found yourself, because you're too close to your own mental model to see the gap.

Proving forces precision, and precision exposes every place where the spec was vague.

## A playground where it can fail

Here's the catch: none of this works without the right infrastructure.

An agent that proves its work has to run the whole system. It has to create users, send requests, break things, inspect the database, read the logs, and then do it all again. You can't do that on a staging environment shared with everyone else, and you certainly can't do it on production. A laptop with half the services mocked out only proves what the mocks allow.

What AI needs is a playground: a place where failing is safe.

At [Leverage](https://leverage.computer/), we call these **devloops**. A devloop is an ephemeral, full-stack environment of our platform that spins up in one to two minutes. It comes with good defaults, test users, and skills: everything an agent needs to bring up its own environment per worktree, use it, and throw it away.

<figure class="inference-viz viz-envs" data-inference-viz="envs" aria-label="Each worktree gets its own ephemeral full-stack devloop">
  <figcaption>One worktree, one agent, one disposable stack.</figcaption>
  <div class="viz-envs__grid">
    <div class="viz-env">
      <span class="viz-kicker">worktree a</span>
      <strong>feat/invites</strong>
      <div class="viz-env__stack"><span>web</span><span>api</span><span>db</span><span>queue</span></div>
      <small>seeded users · skills</small>
      <div class="viz-env__boot"><span></span></div>
    </div>
    <div class="viz-env is-failing">
      <span class="viz-kicker">worktree b</span>
      <strong>fix/billing</strong>
      <div class="viz-env__stack"><span>web</span><span>api</span><span class="is-broken">db</span><span>queue</span></div>
      <small>broken db · no harm</small>
      <div class="viz-env__boot"><span></span></div>
    </div>
    <div class="viz-env">
      <span class="viz-kicker">worktree c</span>
      <strong>infra/queue</strong>
      <div class="viz-env__stack"><span>web</span><span>api</span><span>db</span><span>queue</span></div>
      <small>seeded users · skills</small>
      <div class="viz-env__boot"><span></span></div>
    </div>
  </div>
  <div class="viz-envs__foot">
    <span>ready in ~1–2 min</span>
    <span>isolated</span>
    <span>disposable</span>
  </div>
</figure>

Isolation is what makes this scale. Three agents on three branches don't fight over one database. A failed migration in one worktree is a non-event. The agent can be as destructive as the proof requires, because the environment is disposable by design.

The skills matter as much as the environment. An environment the agent doesn't know how to drive is just expensive idle compute. The skills teach it how to seed data, where the logs live, how to sign in as a test user, and which metrics to look at.

This is the foundational work I mean. It isn't glamorous: container images, seed scripts, service wiring, auth for test users, and documentation written for an agent instead of a human. But it's the difference between an agent that *claims* its work is done and one that shows you.

## Playgrounds for humans, too

The same idea extends beyond agents. On top of devloops, we have automated PR preview environments. Designers, and anyone else in the company, can try new things or test infrastructure changes end to end before anything lands on staging.

Our philosophy in a nutshell: test everything in the PR, merge to main, test on staging, then approve to prod.

<figure class="inference-viz viz-path" data-inference-viz="path" aria-label="Path to production: PR, main, staging, prod">
  <figcaption>Most of the proving happens before the merge.</figcaption>
  <div class="viz-path__flow" aria-hidden="true">
    <div class="viz-step is-hot">
      <span class="viz-kicker">01</span>
      <strong>PR</strong>
      <small>proof + preview</small>
    </div>
    <div class="viz-link"><span class="viz-packet"></span></div>
    <div class="viz-step">
      <span class="viz-kicker">02</span>
      <strong>main</strong>
      <small>via merge queue</small>
    </div>
    <div class="viz-link"><span class="viz-packet viz-packet--late"></span></div>
    <div class="viz-step">
      <span class="viz-kicker">03</span>
      <strong>staging</strong>
      <small>test again</small>
    </div>
    <div class="viz-link"><span class="viz-packet"></span></div>
    <div class="viz-step viz-step--gate">
      <span class="viz-kicker">04</span>
      <strong>prod</strong>
      <small>a human approves</small>
    </div>
  </div>
</figure>

Every stage has a job. The PR is where most of the proving happens, by agents and humans alike. Staging is a second look in a shared environment. Production gets a deliberate human decision. At our size, it works great.

## Speed moves the bottleneck

Of course, speed brought its own problems.

With agents, we ship a lot. Keeping PRs up to date with main became really annoying, so we adopted [GitHub merge queues](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue). Then CI became the constraint, in both cost and time, so we optimized it for cheaper, faster cycles. Every fix moved the bottleneck somewhere else.

<figure class="inference-viz viz-shift" data-inference-viz="shift" aria-label="The bottleneck keeps moving as each constraint is solved">
  <figcaption>Solve one constraint, meet the next.</figcaption>
  <div class="viz-shift__rows">
    <div class="viz-shift__row is-done"><span class="viz-shift__problem">writing the code</span><span class="viz-shift__answer">agents</span><span class="viz-shift__state">solved</span></div>
    <div class="viz-shift__row is-done"><span class="viz-shift__problem">trusting the code</span><span class="viz-shift__answer">devloops + proof</span><span class="viz-shift__state">solved</span></div>
    <div class="viz-shift__row is-done"><span class="viz-shift__problem">stale PRs</span><span class="viz-shift__answer">merge queues</span><span class="viz-shift__state">solved</span></div>
    <div class="viz-shift__row is-done"><span class="viz-shift__problem">CI cost &amp; cycle time</span><span class="viz-shift__answer">optimized CI</span><span class="viz-shift__state">solved</span></div>
    <div class="viz-shift__row is-now"><span class="viz-shift__problem">feedback for the agent</span><span class="viz-shift__answer">fast, deterministic signals</span><span class="viz-shift__state">now</span></div>
    <div class="viz-shift__row is-next"><span class="viz-shift__problem">?</span><span class="viz-shift__answer">?</span><span class="viz-shift__state">next</span></div>
  </div>
</figure>

Now we're looking for fast, deterministic quality signals to give the AI more feedback. End-to-end proof is the strongest signal we have, but also the slowest. The checks that tell an agent it's wrong in seconds instead of minutes, and tell it the same thing every time, let it iterate many more times before it ever needs a devloop.

## Foundations are the multiplier

Good engineering practices have never mattered more.

It's tempting to think better models make engineering discipline less important. My experience is the opposite. The model is already capable of proving its work. Whether it actually *can* depends almost entirely on what you've built around it: reproducible environments, seeded data, observable systems, isolated previews, a clear path to production.

Those foundations are what turn a capable model into a trustworthy one. Give AI a playground where it can fail, and it will fail there, early and cheaply, instead of in front of your users.

AI should prove its work. Confidence comes from evidence.

I'm curious which limitation we'll hit next.

<div class="post-references" aria-label="References">
  <span>references</span>
  <a href="https://leverage.computer/">Leverage Computer</a>
  <a href="https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue">GitHub docs: managing a merge queue</a>
</div>
