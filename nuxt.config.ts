export default defineNuxtConfig({
  compatibilityDate: '2026-10-05',
  devtools: { enabled: true },
  modules: ['@nuxthub/core', '@nuxt/ui', '@comark/nuxt'],
  ssr: false,
  experimental: {
    typedPages: true,
  },
  runtimeConfig: {
    authPassword: '',
    chatBaseUrl: '',
    chatApiKey: '',
    public: {
      chatModels: [] as { label: string, value: string }[],
    },
  },
  css: ['~/assets/css/main.css'],
  ui: {
    fonts: false,
  },
  hub: {
    db: 'sqlite',
    blob: true,
  },
  routeRules: {
    '/': { redirect: '/bookmarks' },
  },
  app: {
    head: {
      title: 'Workbench',
    },
  },
  icon: {
    provider: 'none',
    clientBundle: {
      scan: {
        globInclude: ['**/*.{vue,jsx,tsx,ts,md,mdc,mdx,yml,yaml}'],
      },
    },
  },
})
