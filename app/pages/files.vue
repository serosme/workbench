<script setup lang="ts">
const { tree, upload, refresh } = useFiles()
const uploadForm = useFileUploadForm()
const deleteForm = useFileDeleteForm()
const { remove } = useDeleteFile()
const { getMenu } = useFileMenu(uploadForm, deleteForm)
</script>

<template>
  <div class="pl-[30vw] pr-[20vw] py-[10vh] flex h-screen">
    <UButton
      to="/bookmarks"
      icon="i-lucide-bookmark"
      aria-label="Bookmarks"
      color="neutral"
      variant="ghost"
      class="fixed bottom-4 right-4"
    />
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
    <FileDeleteModal
      v-model:open="deleteForm.modal.open"
      :node="deleteForm.modal.node"
      :remove="remove"
      @deleted="refresh"
    />
  </div>
</template>
