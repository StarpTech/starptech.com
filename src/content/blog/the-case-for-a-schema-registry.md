---
title: "The case for a schema registry"
description: "Schemas are documentation, but they're also infrastructure. Here's why putting them in one place changes how teams build APIs."
category: "API infrastructure"
date: 2026-04-12
draft: true
---

Most teams treat their GraphQL schema like documentation: something to update at the end of the project, when the dust has settled. That's a mistake. The schema is **infrastructure** — the contract between what your producers know and what your consumers expect. Treat it like infrastructure.

## Why a registry matters

A schema registry is a single source of truth for every schema your organization ships. It's the place that knows:

- which fields are deprecated and when they'll be removed
- which clients are using which fields
- which subgraphs are healthy and ready to compose
- which breaking changes were attempted and rejected

Without it, every team accumulates their own version of schema knowledge — usually in a Notion doc that's three releases stale. The cost of that is invisible until somebody ships a "small" type change at 4 PM on a Friday.

> The rule is simple: if a change to your API requires a meeting, you don't have a schema registry. You have a process.

## What it actually does

In practice, a registry has three jobs.

1. **Validate.** Every schema change is checked against the previous version. Breaking changes are flagged before they hit production.
2. **Compose.** Multiple subgraphs are merged into a single supergraph that consumers see as one API.
3. **Track.** Field-level usage analytics tell you which parts of your schema are load-bearing and which can be removed safely.

The validate step looks roughly like this in CI:

```ts
import { check } from "@wundergraph/cosmo";

const result = await check.schema({
  subgraph: "products",
  schema: newSchema,
  baseline: "production",
});

if (result.breakingChanges.length > 0) {
  console.error("breaking changes detected:");
  for (const change of result.breakingChanges) {
    console.error(`  ${change.severity}: ${change.message}`);
  }
  process.exit(1);
}
```

If you've ever rolled back a deploy because a field went missing, this fifteen-line check would have caught it.

## The compounding effect

Teams that adopt a registry early ship faster, not slower. The reason is counterintuitive: more guardrails up front means fewer rollbacks, fewer emergency deprecations, and fewer cross-team meetings to negotiate "small" schema tweaks.

Treat your schema like the infrastructure it is. The registry is just the place that proves it.
