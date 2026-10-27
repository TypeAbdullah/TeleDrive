import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'TeleDrive',
  description: 'Enterprise-grade Telegram-backed cloud storage with Cloudflare Edge distributed streaming.',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,
  appearance: 'dark', // Pure Black & White monochrome aesthetic

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500;600&display=swap', rel: 'stylesheet' }],
    ['meta', { name: 'theme-color', content: '#000000' }]
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

    // Scope sidebar exclusively to /guide/ so Home Page has NO sidebar
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
      message: 'Released under the MIT License • Monochromatic Edition',
      copyright: 'Copyright © 2026 TeleDrive'
    }
  },

  vite: {
    ssr: {
      noExternal: ['three']
    }
  }
});
