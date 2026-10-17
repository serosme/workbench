export default defineAppConfig({
  ui: {
    formField: {
      slots: {
        // 校验报错只留可访问文本，不占布局高度
        error: 'sr-only',
      },
    },
  },
})
