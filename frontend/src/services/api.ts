import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// Knowledge Base
export const knowledgeApi = {
  list: () => api.get('/knowledge/bases'),
  get: (id: string) => api.get(`/knowledge/bases/${id}`),
  create: (data: { name: string; description: string }) =>
    api.post('/knowledge/bases', data),
  delete: (id: string) => api.delete(`/knowledge/bases/${id}`),
  listDocuments: (kbId: string) => api.get(`/knowledge/bases/${kbId}/documents`),
  addDocuments: (kbId: string, urls: string[]) =>
    api.post(`/knowledge/bases/${kbId}/documents`, { urls }),
  deleteDocument: (kbId: string, docId: string) =>
    api.delete(`/knowledge/bases/${kbId}/documents/${docId}`),
}

// Chat
export const chatApi = {
  listConversations: (kbId: string) =>
    api.get('/chat/conversations', { params: { knowledge_base_id: kbId } }),
  getMessages: (convId: string) => api.get(`/chat/conversations/${convId}/messages`),
  deleteConversation: (convId: string) => api.delete(`/chat/conversations/${convId}`),
}

// Settings
export const settingsApi = {
  listModels: (type?: string) =>
    api.get('/settings/models', { params: type ? { type } : {} }),
  createModel: (data: {
    type: string
    name: string
    base_url: string
    api_key: string
    model_name: string
    is_default: boolean
  }) => api.post('/settings/models', data),
  updateModel: (id: string, data: {
    type: string
    name: string
    base_url: string
    api_key: string
    model_name: string
    is_default: boolean
  }) => api.put(`/settings/models/${id}`, data),
  deleteModel: (id: string) => api.delete(`/settings/models/${id}`),
  testModel: (data: {
    type: string
    base_url: string
    api_key: string
    model_name: string
  }) => api.post('/settings/models/test', data),
}

export default api
