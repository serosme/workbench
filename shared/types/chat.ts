// `/api/chat/models` 返回的下拉项：label 优先取 provider 的 name，value 是传给模型的 id
export interface ChatModel {
  label: string
  value: string
}
