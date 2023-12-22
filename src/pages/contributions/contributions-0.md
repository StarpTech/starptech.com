---
layout: ../../layouts/MarkdownWorksLayout.astro
title: 'Using multiple concurrent readers makes async metrics produce wrong results'
description: 'During my work on WunderGraph Cosmo, I found that the async metrics are producing wrong results. This probably affect hundreds of companies using async metrics.'
image:
    url: '/GitHub.webp'
    alt: 'GitHub wallpaper'
worksImage1:
    url: ''
    alt: ''
worksImage2:
    url: ''
    alt: ''
platform: Backend
stack: OTEL, Go
website: 
github: https://github.com/open-telemetry/opentelemetry-go/issues/4741
---

During my work on WunderGraph Cosmo, I found that the async metrics are producing wrong results. This probably affect hundreds of companies.