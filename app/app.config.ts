export default defineAppConfig({
  ui: {
    formField: {
      slots: {
        // 隐藏校验报错文字，避免撑高弹窗；必填只靠星号 + 红框
        error: 'hidden',
      },
    },
  },
})
