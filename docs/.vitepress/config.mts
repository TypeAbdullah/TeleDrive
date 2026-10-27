import { defineConfig } from 'vitepress';

// When deploying to GitHub Pages via GitHub Actions, base path is /TeleDrive/
const base = process.env.GITHUB_ACTIONS ? '/TeleDrive/' : '/';

export default defineConfig({
  title: 'TeleDrive',
  description: 'Enterprise-grade Telegram-backed cloud storage with Cloudflare Edge distributed streaming.',
  base,
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,
  appearance: 'dark',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500;600&display=swap', rel: 'stylesheet' }],
    ['meta', { name: 'theme-color', content: '#09090b' }]
  ],

  themeConfig: {
    siteTitle: 'TeleDrive',
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Architecture', link: '/guide/architecture' },
      { text: 'Cloudflare Edge', link: '/guide/cloudflare-edge' },
      { text: 'API Reference', link: '/guide/developer-api' },
      { text: 'Deployment', link: '/guide/deployment' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/introduction' },
            { text: 'Quick Start', link: '/guide/getting-started' },
            { text: 'Configuration & Env', link: '/guide/configuration' }
          ]
        },
        {
          text: 'System Design & Core',
          items: [
            { text: 'Architecture Overview', link: '/guide/architecture' },
            { text: 'Cloudflare Edge Gateway', link: '/guide/cloudflare-edge' },
            { text: 'Security & HMAC Tokens', link: '/guide/security' }
          ]
        },
        {
          text: 'Developers & Integration',
          items: [
            { text: 'REST API & OpenAPI', link: '/guide/developer-api' },
            { text: 'Client Examples', link: '/guide/developer-api#client-examples' }
          ]
        },
        {
          text: 'Operations & DevOps',
          items: [
            { text: 'Production Deployment', link: '/guide/deployment' },
            { text: 'CI/CD & GitHub Actions', link: '/guide/deployment#github-actions-worker-deploy' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/TypeAbdullah/TeleDrive' }
    ],

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3],
      label: 'On This Page'
    },

    footer: {
      message: 'Released under the MIT License',
      copyright: `Copyright © ${new Date().getFullYear()} <a href="https://github.com/TypeAbdullah" target="_blank" rel="noreferrer">TypeAbdullah</a>`
    }
  },

  vite: {
    ssr: {
      noExternal: ['three']
    }
  }
});
