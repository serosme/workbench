export default defineNuxtConfig({
  compatibilityDate: '2026-10-05',
  devtools: { enabled: true },
  modules: ['@nuxthub/core', '@nuxt/ui'],
  // Nuxt 4.6.0 的 Windows 回归（nuxt#36467）：Nitro externals 的字符串规则拿带反斜杠的解析路径
  // 匹配不到，导致 nuxt/dist 下的渲染器被留作 external、读不到 manifest/precomputed，所有页面 500。
  // 用分隔符无关的正则强制 inline（Linux 上等价）。官方修好后可移除。
  nitro: {
    externals: {
      inline: [/[\\/]node_modules[\\/]nuxt[\\/]dist[\\/]/],
    },
  },
  ssr: false,
  experimental: {
    typedPages: true,
  },
  runtimeConfig: {
    authPassword: '',
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
