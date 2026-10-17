export default defineNuxtConfig({
  compatibilityDate: '2026-10-05',
  devtools: { enabled: true },
  modules: ['@nuxthub/core', '@nuxt/ui', '@comark/nuxt'],
  ssr: false,
  experimental: {
    typedPages: true,
    routeTypedFetch: true,
    strictRouteTypes: true,
  },
  runtimeConfig: {
    authPassword: '',
    chatBaseUrl: '',
    chatApiKey: '',
  },
  css: ['~/assets/css/main.css'],
  ui: {
    fonts: false,
  },
  hub: {
    db: 'sqlite',
  },
  routeRules: {
    '/': { redirect: '/bookmarks' },
  },
  app: {
    head: {
      title: 'Workbench',
      htmlAttrs: {
        lang: 'en',
      },
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
