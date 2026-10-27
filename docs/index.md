---
layout: home

hero:
  name: "TeleDrive"
  text: "Distributed Telegram Cloud Storage"
  tagline: "Enterprise object storage powered by MTProto, Cloudflare Workers, and zero RAM buffer streaming."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: System Architecture
      link: /guide/architecture
    - theme: alt
      text: View on GitHub
      link: https://github.com/TypeAbdullah/TeleDrive

features:
  - icon: ⚡
    title: Cloudflare Edge Gateway
    details: Zero-dependency V8 isolate worker. Verifies HMAC-SHA-256 tokens at the edge and handles RFC 7233 byte-range streaming.
  - icon: 💾
    title: Bounded-Memory Origin
    details: Strictly capped to under 15MB RAM per active stream. Native backpressure pipelines prevent Node.js memory exhaustion.
  - icon: 🛡️
    title: Cryptographic Security
    details: Tamper-proof signed URLs with microsecond edge validation and instant multi-layer revocation via Redis and MongoDB.
  - icon: 🌐
    title: Telegram MTProto Backplane
    details: Partitions and streams files up to 2GB across Telegram storage channels with zero recurring cloud storage fees.
  - icon: 🔑
    title: Developer REST & OpenAPI
    details: Fully typed endpoints with Better-Auth, Bearer tokens, and X-API-Key developer credentials.
  - icon: 🚀
    title: GitHub Actions & Worker CI
    details: Automated build, test, and VitePress static site deployment with GitHub Actions worker runners.
---
