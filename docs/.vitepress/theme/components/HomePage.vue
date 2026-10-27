<template>
  <div class="monochrome-homepage">
    <!-- Hero Section with Three.js Background -->
    <section class="hero-section">
      <ThreeHero />

      <div class="hero-content">
        <!-- Status Badge -->
        <div class="status-badge">
          <span class="status-dot"></span>
          <span class="status-text">TeleDrive v2.0 • Distributed Cloud Infrastructure</span>
        </div>

        <!-- Hero Headline -->
        <h1 class="hero-title">
          Unlimited Cloud Storage.<br />
          <span class="gradient-text">Edge Accelerated.</span>
        </h1>

        <!-- Subtitle -->
        <p class="hero-subtitle">
          Turn Telegram MTProto into an enterprise-grade distributed object store.
          Accelerated globally with Cloudflare Workers, byte-range streaming, and HMAC-SHA-256 security.
        </p>

        <!-- CTA Buttons -->
        <div class="cta-group">
          <a href="/guide/getting-started" class="btn btn-primary">
            <span>Explore Documentation</span>
            <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </a>
          <a href="/guide/cloudflare-edge" class="btn btn-secondary">
            <span>Cloudflare Edge Worker</span>
          </a>
          <a href="https://github.com/TypeAbdullah/TeleDrive" target="_blank" rel="noreferrer" class="btn btn-outline">
            <svg class="btn-github" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span>GitHub</span>
          </a>
        </div>

        <!-- Terminal Quickstart Preview -->
        <div class="terminal-bar">
          <div class="terminal-dots">
            <span></span><span></span><span></span>
          </div>
          <span class="terminal-prefix">$</span>
          <code class="terminal-command">git clone https://github.com/TypeAbdullah/TeleDrive.git &amp;&amp; cd TeleDrive</code>
          <button class="terminal-copy" @click="copyCommand">
            <span v-if="copied">Copied!</span>
            <span v-else>Copy</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Metrics Stat Bar -->
    <section class="metrics-section">
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">&lt; 15 MB</div>
          <div class="metric-label">Origin RAM Ceiling</div>
          <div class="metric-sub">Zero whole-file RAM buffering with backpressure</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">RFC 7233</div>
          <div class="metric-label">HTTP Range Standard</div>
          <div class="metric-sub">Full byte-level video scrubbing &amp; multi-stream seeking</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">HMAC-256</div>
          <div class="metric-label">Edge Web Crypto</div>
          <div class="metric-sub">Sub-millisecond token verification at Cloudflare Edge</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">2,000 MB</div>
          <div class="metric-label">Max File Size</div>
          <div class="metric-sub">Distributed chunking across MTProto channels</div>
        </div>
      </div>
    </section>

    <!-- Interactive Architecture Pipeline -->
    <section class="section-container">
      <div class="section-header">
        <div class="section-tag">High Performance Infrastructure</div>
        <h2 class="section-title">End-to-End Distributed Topology</h2>
        <p class="section-desc">How TeleDrive delivers gigabytes of storage with lightning-fast edge streaming.</p>
      </div>

      <div class="pipeline-wrapper">
        <div class="pipeline-step">
          <div class="step-number">01</div>
          <div class="step-title">Client Request</div>
          <p class="step-desc">Web app or API client requests signed authorization or starts a partial byte-range download.</p>
          <div class="step-tag">REST &amp; Web Crypto</div>
        </div>

        <div class="pipeline-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>

        <div class="pipeline-step active">
          <div class="step-number">02</div>
          <div class="step-title">Cloudflare Edge Gateway</div>
          <p class="step-desc">Zero-dependency V8 isolate worker verifies HMAC token, checks cache, and slices RFC 7233 ranges.</p>
          <div class="step-tag">Cloudflare Worker</div>
        </div>

        <div class="pipeline-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>

        <div class="pipeline-step">
          <div class="step-number">03</div>
          <div class="step-title">Origin Streaming Bridge</div>
          <p class="step-desc">Node.js Express backend validates gateway secret and opens bounded backpressure streams.</p>
          <div class="step-tag">Concurrency Guard</div>
        </div>

        <div class="pipeline-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>

        <div class="pipeline-step">
          <div class="step-number">04</div>
          <div class="step-title">MTProto Storage Nodes</div>
          <p class="step-desc">Direct high-speed retrieval from Telegram data centers via @mtcute/node pipeline.</p>
          <div class="step-tag">Telegram Cloud Engine</div>
        </div>
      </div>
    </section>

    <!-- Bento Grid Features -->
    <section class="section-container">
      <div class="section-header">
        <div class="section-tag">Key Features</div>
        <h2 class="section-title">Built for Modern Scalability</h2>
        <p class="section-desc">Engineered from the ground up for speed, cryptographic security, and zero cloud storage bills.</p>
      </div>

      <div class="bento-grid">
        <div class="bento-card bento-wide">
          <div class="bento-badge">Core Gateway</div>
          <h3>Edge Worker Distributed Downloads</h3>
          <p>
            The custom <code>worker.js</code> acts as a smart CDN edge shield. It performs Web Crypto HMAC verification,
            serves public immutable files directly from Edge Cache, handles client disconnect aborts instantly, and prevents origin overload.
          </p>
          <div class="code-pill">worker.js • Zero dependencies • Sub-millisecond response</div>
        </div>

        <div class="bento-card">
          <div class="bento-badge">Memory Management</div>
          <h3>Strict Bounded-RAM Architecture</h3>
          <p>
            No matter how large the file (up to 2GB), our Node.js streaming bridge limits RAM usage per stream to under 15MB using strict stream piping and socket backpressure.
          </p>
        </div>

        <div class="bento-card">
          <div class="bento-badge">Security</div>
          <h3>Cryptographic Token Lifecycle</h3>
          <p>
            HMAC-SHA-256 tokens with configurable expiration, instant Redis-backed JTI revocation lists, and database share link kill-switches.
          </p>
        </div>

        <div class="bento-card">
          <div class="bento-badge">Developer API</div>
          <h3>REST &amp; OpenAPI Spec</h3>
          <p>
            Complete developer-first API with API keys (<code>keyId:rawSecret</code>), Better-Auth session tokens, file uploads, paginated lists, and signed streaming endpoints.
          </p>
        </div>

        <div class="bento-card bento-wide">
          <div class="bento-badge">Production Ready</div>
          <h3>GitHub Actions CI/CD &amp; Worker Deploy</h3>
          <p>
            Fully automated testing, linting, Docker orchestration, and VitePress static doc generation deployed with GitHub Actions workers to GitHub Pages or Cloudflare.
          </p>
          <div class="tags-row">
            <span class="tag">Docker Compose</span>
            <span class="tag">MongoDB</span>
            <span class="tag">Redis BullMQ</span>
            <span class="tag">GitHub Actions</span>
            <span class="tag">Cloudflare Wrangler</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Interactive Code Showcase -->
    <section class="section-container">
      <div class="section-header">
        <div class="section-tag">Developer Experience</div>
        <h2 class="section-title">Two Lines to Stream</h2>
        <p class="section-desc">Generate signed, edge-accelerated URLs via our typed Developer API.</p>
      </div>

      <div class="code-showcase-box">
        <div class="code-header">
          <div class="code-dots">
            <span></span><span></span><span></span>
          </div>
          <div class="code-title">download-client.ts</div>
        </div>
        <pre class="code-content"><code><span class="keyword">import</span> { TeleDriveClient } <span class="keyword">from</span> <span class="string">'@teledrive/sdk'</span>;

<span class="keyword">const</span> client = <span class="keyword">new</span> TeleDriveClient({
  apiKey: process.env.TELEDRIVE_API_KEY, <span class="comment">// keyId:rawSecret</span>
  endpoint: <span class="string">'https://api.yourdomain.com'</span>
});

<span class="comment">// Request edge-signed HMAC download authorization</span>
<span class="keyword">const</span> { downloadUrl, token, expiresIn } = <span class="keyword">await</span> client.files.createDownloadUrl(<span class="string">'file_xyz892'</span>, {
  expiresInSeconds: 3600
});

console.log(<span class="string">'Edge Download URL:'</span>, downloadUrl);
<span class="comment">// =&gt; https://download.yourdomain.com/d/eyJhbGciOi...</span></code></pre>
      </div>
    </section>

    <!-- CTA Footer Banner -->
    <section class="cta-banner">
      <div class="cta-banner-content">
        <h2>Ready to deploy your distributed cloud?</h2>
        <p>Get started in under 5 minutes with our step-by-step setup guide and Docker configuration.</p>
        <div class="cta-actions">
          <a href="/guide/getting-started" class="btn btn-primary">Start Quick Setup</a>
          <a href="/guide/architecture" class="btn btn-secondary">Read System Architecture</a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ThreeHero from './ThreeHero.vue';

const copied = ref(false);

const copyCommand = () => {
  navigator.clipboard.writeText('git clone https://github.com/TypeAbdullah/TeleDrive.git && cd TeleDrive');
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
};
</script>

<style scoped>
.monochrome-homepage {
  position: relative;
  width: 100%;
  overflow-x: hidden;
  background-color: #000000;
  color: #ffffff;
  padding-bottom: 5rem;
}

/* Hero Section */
.hero-section {
  position: relative;
  min-height: 82vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 6rem 1.5rem 4rem 1.5rem;
  overflow: hidden;
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  margin-bottom: 2rem;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #d4d4d8;
}

.status-dot {
  width: 7px;
  height: 7px;
  background-color: #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 10px #ffffff;
  animation: pulseDot 2s infinite ease-in-out;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.85); }
}

.hero-title {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.04em;
  margin: 0 0 1.5rem 0;
  color: #ffffff;
}

.gradient-text {
  background: linear-gradient(180deg, #ffffff 30%, #71717a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: clamp(1.05rem, 2vw, 1.25rem);
  color: #a1a1aa;
  max-width: 680px;
  line-height: 1.6;
  margin: 0 0 2.5rem 0;
  font-weight: 400;
}

/* CTA buttons */
.cta-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
}

.btn-primary {
  background: #ffffff;
  color: #000000;
  border: 1px solid #ffffff;
  box-shadow: 0 0 25px rgba(255, 255, 255, 0.2);
}

.btn-primary:hover {
  background: #e4e4e7;
  transform: translateY(-2px);
  box-shadow: 0 0 35px rgba(255, 255, 255, 0.35);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.btn-outline {
  background: transparent;
  color: #a1a1aa;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-outline:hover {
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.3);
}

.btn-icon {
  width: 18px;
  height: 18px;
}

.btn-github {
  width: 18px;
  height: 18px;
}

/* Terminal bar */
.terminal-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(18, 18, 20, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 10px 18px;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.85rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(16px);
  max-width: 95%;
}

.terminal-dots {
  display: flex;
  gap: 6px;
}

.terminal-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3f3f46;
}

.terminal-prefix {
  color: #71717a;
}

.terminal-command {
  color: #f4f4f5;
  background: transparent;
  padding: 0;
}

.terminal-copy {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e4e4e7;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: auto;
}

.terminal-copy:hover {
  background: #ffffff;
  color: #000000;
}

/* Metrics Section */
.metrics-section {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(9, 9, 11, 0.6);
  padding: 3rem 1.5rem;
}

.metrics-grid {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 2rem;
}

.metric-card {
  text-align: left;
  padding: 0.5rem;
}

.metric-value {
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #ffffff;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e4e4e7;
  margin-bottom: 4px;
}

.metric-sub {
  font-size: 0.8rem;
  color: #71717a;
  line-height: 1.4;
}

/* Section Containers */
.section-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 5rem 1.5rem 2rem 1.5rem;
}

.section-header {
  text-align: center;
  max-width: 650px;
  margin: 0 auto 3.5rem auto;
}

.section-tag {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a1a1aa;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid #3f3f46;
  padding-bottom: 2px;
}

.section-title {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 0 0 1rem 0;
  color: #ffffff;
}

.section-desc {
  color: #a1a1aa;
  font-size: 1.05rem;
  line-height: 1.6;
}

/* Pipeline Flow */
.pipeline-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.pipeline-step {
  flex: 1;
  min-width: 200px;
  background: #09090b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.5rem;
  position: relative;
  transition: all 0.3s ease;
}

.pipeline-step:hover,
.pipeline-step.active {
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 8px 30px rgba(255, 255, 255, 0.04);
}

.step-number {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.75rem;
  color: #71717a;
  margin-bottom: 0.75rem;
}

.step-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.5rem;
}

.step-desc {
  font-size: 0.85rem;
  color: #a1a1aa;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.step-tag {
  display: inline-block;
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #d4d4d8;
}

.pipeline-arrow {
  color: #3f3f46;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pipeline-arrow svg {
  width: 20px;
  height: 20px;
}

@media (max-width: 850px) {
  .pipeline-arrow {
    display: none;
  }
}

/* Bento Grid */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .bento-grid {
    grid-template-columns: 1fr;
  }
}

.bento-card {
  background: #09090b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 2rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.bento-card:hover {
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-3px);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.6);
}

.bento-wide {
  grid-column: span 2;
}

@media (max-width: 900px) {
  .bento-wide {
    grid-column: span 1;
  }
}

.bento-badge {
  display: inline-block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #71717a;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.bento-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 0.75rem 0;
  letter-spacing: -0.02em;
}

.bento-card p {
  color: #a1a1aa;
  font-size: 0.92rem;
  line-height: 1.6;
  margin: 0;
}

.code-pill {
  margin-top: 1.25rem;
  display: inline-block;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 6px 12px;
  border-radius: 6px;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.75rem;
  color: #d4d4d8;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 1.25rem;
}

.tag {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #d4d4d8;
}

/* Code Showcase Box */
.code-showcase-box {
  background: #09090b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 16px 45px rgba(0, 0, 0, 0.7);
}

.code-header {
  background: #121214;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.code-dots {
  display: flex;
  gap: 6px;
}

.code-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #27272a;
}

.code-title {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.8rem;
  color: #71717a;
}

.code-content {
  margin: 0;
  padding: 1.5rem;
  background: transparent;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.9rem;
  line-height: 1.6;
  color: #e4e4e7;
  overflow-x: auto;
}

.keyword { color: #ffffff; font-weight: 600; }
.string { color: #a1a1aa; }
.comment { color: #52525b; font-style: italic; }

/* CTA Footer Banner */
.cta-banner {
  max-width: 1100px;
  margin: 5rem auto 0 auto;
  padding: 0 1.5rem;
}

.cta-banner-content {
  background: linear-gradient(180deg, #121214 0%, #09090b 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 4rem 2rem;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.cta-banner-content h2 {
  font-size: clamp(1.8rem, 3.5vw, 2.5rem);
  font-weight: 700;
  margin: 0 0 1rem 0;
  color: #ffffff;
  letter-spacing: -0.03em;
}

.cta-banner-content p {
  color: #a1a1aa;
  max-width: 550px;
  margin: 0 auto 2rem auto;
  font-size: 1rem;
}

.cta-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}
</style>
