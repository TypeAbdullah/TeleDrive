# Production Deployment & CI/CD

This guide explains how to deploy TeleDrive, the Cloudflare Edge Worker, and automatically publish this VitePress documentation with GitHub Actions.

---

## 1. Automated Documentation Deployment via GitHub Actions

This repository includes a dedicated GitHub Actions workflow (`.github/workflows/deploy-docs.yml`) that builds and deploys these VitePress docs on every push to `main` or `master`.

### GitHub Actions Workflow File (`.github/workflows/deploy-docs.yml`)

```yaml
name: Deploy TeleDrive Documentation

on:
  push:
    branches:
      - main
      - master
    paths:
      - 'docs/**'
      - '.github/workflows/deploy-docs.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: docs/package-lock.json

      - name: Install documentation dependencies
        run: npm --prefix docs install

      - name: Build VitePress production bundle
        run: npm --prefix docs run build

      - name: Setup GitHub Pages
        uses: actions/configure-pages@v4

      - name: Upload Pages Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs/.vitepress/dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Enabling GitHub Pages in your Repository
1. Navigate to your repository settings on GitHub: **Settings** ➔ **Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push changes to `main` — the GitHub runner will automatically build the site and deploy it.

---

## 2. Deploying the Cloudflare Worker Gateway

Deploy `workers/worker.js` directly to Cloudflare:

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Deploy the worker
cd workers
npx wrangler deploy worker.js --name teledrive-download-gateway
```

### GitHub Actions Deployment for Cloudflare Worker
Add this job to deploy your edge worker automatically:

```yaml
  deploy-worker:
    name: Deploy Cloudflare Worker
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'workers'
```

---

## 3. Deploying TeleDrive Backend & Frontend (Docker)

Use the production `docker-compose.yml`:

```bash
# Build and run all services in daemon mode
docker-compose -f docker-compose.yml up -d --build
```
