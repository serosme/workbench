<script setup lang="ts">
const { tree, upload, refresh } = useFiles()
const uploadForm = useFileUploadForm()
const { remove } = useDeleteFile(refresh)
const { getMenu } = useFileMenu(uploadForm, remove)
</script>

<template>
  <div class="flex h-full">
    <div class="w-1/2 min-w-0 h-full">
      <FileTree :items="tree" :get-menu="getMenu" />
    </div>
    <!-- 右侧留给后续的文件预览 -->
    <div class="w-1/2 min-w-0" />
    <FileUploadModal
      v-model:open="uploadForm.modal.open"
      :default-path="uploadForm.modal.defaultPath"
      :upload="upload"
      @saved="refresh"
    />
  </div>
</template>
