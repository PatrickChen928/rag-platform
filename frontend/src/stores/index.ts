import { create } from 'zustand'

export interface KnowledgeBase {
  id: string
  name: string
  description: string
  document_count: number
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  url: string
  title: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  chunk_count: number
  error_message: string
  created_at: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: { url: string; title: string; chunk_text: string }[]
  created_at: string
}

export interface Conversation {
  id: string
  knowledge_base_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ModelConfig {
  id: string
  type: 'llm' | 'embedding'
  name: string
  base_url: string
  model_name: string
  is_default: boolean
  created_at: string
}

interface AppStore {
  // Current selection
  selectedKbId: string | null
  setSelectedKbId: (id: string | null) => void

  // Chat state
  currentConversationId: string | null
  setCurrentConversationId: (id: string | null) => void
  messages: Message[]
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
}

export const useAppStore = create<AppStore>((set) => ({
  selectedKbId: null,
  setSelectedKbId: (id) => set({ selectedKbId: id }),

  currentConversationId: null,
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  messages: [],
  setMessages: (messagesOrFn) =>
    set((state) => ({
      messages: typeof messagesOrFn === 'function' ? messagesOrFn(state.messages) : messagesOrFn,
    })),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages]
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
        }
      }
      return { messages }
    }),
}))
