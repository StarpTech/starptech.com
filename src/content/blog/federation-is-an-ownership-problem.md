---
title: "Federation isn't a graph problem, it's an ownership problem"
description: "After three years building a federation platform, the hardest parts have nothing to do with the graph."
date: 2026-03-04
draft: true
---

I spent the better part of three years thinking that federation was about graphs. Subgraphs, supergraphs, gateway composition, query planning — all the engineering you read about in the papers.

After watching dozens of teams adopt federation in anger, I think we got the framing wrong.

## The hard part isn't the algorithm

Query planning is a solved problem. There are good open implementations, the academic work is twenty years old, and modern federation routers can plan a 50-subgraph query in single-digit milliseconds. That's not where teams struggle.

The hard part is *who owns what*.

## What federation actually demands

Adopting federation forces you to answer questions that monolithic schemas let you defer:

- Which team owns the `User` type — and what happens when two teams need to extend it?
- Who pays the on-call cost when a subgraph slows down a federated query?
- How do you prevent one team's schema change from silently breaking another team's clients?
- Whose budget pays for the gateway?

These are organizational questions disguised as technical ones. The graph is just the surface where the disagreement becomes visible.

## A pattern that works

The teams that succeed at federation tend to converge on the same shape:

1. **One subgraph, one team.** Not "one team owns three subgraphs that occasionally get merged." Each subgraph has a single owner who's on call for it.
2. **A schema registry as the contract surface.** Schema changes are the API between teams. Registries make that contract enforceable.
3. **A platform team that owns the gateway.** Federation is too important to leave as a side project on someone's roadmap.

If those three things aren't in place, you're not running a federated graph. You're running a distributed monolith with a query planner.

## The takeaway

Pick the right tool, sure. But before that, pick the right team boundaries. Federation makes ownership explicit. That's the gift, and that's the cost.
