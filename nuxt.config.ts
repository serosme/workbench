export default defineNuxtConfig({
  compatibilityDate: '2026-10-05',
  devtools: { enabled: true },
  modules: ['@nuxthub/core', '@nuxt/ui'],
  ssr: false,
  experimental: {
    typedPages: true,
    routeTypedFetch: true,
    strictRouteTypes: true,
  },
  runtimeConfig: {
    appPassword: '',
  },
  css: ['~/assets/css/main.css'],
  ui: {
    fonts: false,
  },
  hub: {
    db: 'sqlite',
    blob: true,
  },
  app: {
    head: {
      title: 'Attic',
      htmlAttrs: {
        lang: 'en',
      },
    },
  },
  icon: {
    provider: 'none',
    clientBundle: {
      scan: {
        globInclude: ['**/*.{vue,ts}'],
      },
    },
  },
})
