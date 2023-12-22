---
layout: ../../layouts/MarkdownWorksLayout.astro
title: 'JWT Auth extension for the OTEL collector.'
description: 'Make your OTEL collector secure by using signed JWT.'
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
website: https://github.com/wundergraph/opentelemetry-collector-contrib/blob/dustin/add_jwt_authenticator/extension/jwtauthextension/README.md
github: https://github.com/open-telemetry/opentelemetry-collector-contrib/pull/20524
---

This extension authenticates users who want to send data to your collector with a JWT, enabling multi-tenant use cases easier. Based on the auth claims data, you can use a processor like attributesprocessor to filter or enrich the data. Authenticity is ensured by signing the JWT token with the same secret before.