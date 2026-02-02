import { useState, useEffect, useRef } from 'react'
import {
  PlusOutlined,
  SendOutlined,
  DeleteOutlined,
  LinkOutlined,
  RobotOutlined,
  UserOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import { Select, message, Modal, Tooltip } from 'antd'
import { knowledgeApi, chatApi } from '@/services/api'
import { useAppStore } from '@/stores'
import type { KnowledgeBase, Conversation, Message } from '@/stores'
import dayjs from 'dayjs'
import './Chat.css'

export default function Chat() {
  const {
    selectedKbId,
    setSelectedKbId,
    currentConversationId,
    setCurrentConversationId,
    messages,
    setMessages,
    addMessage,
    updateLastMessage,
  } = useAppStore()

  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [expandedSources, setExpandedSources] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch knowledge bases
  useEffect(() => {
    knowledgeApi.list().then((res) => {
      setKnowledgeBases(res.data)
      if (!selectedKbId && res.data.length > 0) {
        setSelectedKbId(res.data[0].id)
      }
    })
  }, [])

  // Fetch conversations when KB changes
  useEffect(() => {
    if (selectedKbId) {
      chatApi.listConversations(selectedKbId).then((res) => {
        setConversations(res.data)
      })
      setCurrentConversationId(null)
      setMessages([])
    }
  }, [selectedKbId])

  // Fetch messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      chatApi.getMessages(currentConversationId).then((res) => {
        setMessages(res.data)
      })
    }
  }, [currentConversationId])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNewChat = () => {
    setCurrentConversationId(null)
    setMessages([])
    inputRef.current?.focus()
  }

  const handleDeleteConv = async (convId: string) => {
    Modal.confirm({
      title: '删除对话',
      content: '确定要删除这个对话吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await chatApi.deleteConversation(convId)
        setConversations((prev) => prev.filter((c) => c.id !== convId))
        if (currentConversationId === convId) {
          setCurrentConversationId(null)
          setMessages([])
        }
      },
    })
  }

  const handleSend = async () => {
    if (!inputValue.trim() || !selectedKbId || isStreaming) return

    const question = inputValue.trim()
    setInputValue('')
    setIsStreaming(true)

    // Add user message
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: question,
      sources: [],
      created_at: new Date().toISOString(),
    }
    addMessage(userMsg)

    // Add placeholder assistant message
    const assistantMsg: Message = {
      id: `temp-assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      sources: [],
      created_at: new Date().toISOString(),
    }
    addMessage(assistantMsg)

    try {
      const response = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          knowledge_base_id: selectedKbId,
          conversation_id: currentConversationId,
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let sources: Message['sources'] = []
      let newConvId: string | null = null

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'meta' && data.conversation_id) {
                  newConvId = data.conversation_id
                  if (!currentConversationId) {
                    setCurrentConversationId(newConvId)
                  }
                } else if (data.type === 'token') {
                  fullContent += data.content
                  updateLastMessage(fullContent)
                } else if (data.type === 'sources') {
                  sources = data.sources
                }
              } catch {}
            }
          }
        }
      }

      // Update final message with sources
      setMessages((prev) => {
        const updated = [...prev]
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullContent,
            sources,
          }
        }
        return updated
      })

      // Refresh conversations
      if (selectedKbId) {
        chatApi.listConversations(selectedKbId).then((res) => {
          setConversations(res.data)
        })
      }
    } catch (error) {
      message.error('发送失败，请重试')
      // Remove placeholder messages
      setMessages((prev) => prev.slice(0, -2))
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <div className="sidebar-header">
          <Select
            value={selectedKbId}
            onChange={setSelectedKbId}
            placeholder="选择知识库"
            className="kb-select"
            suffixIcon={<DatabaseOutlined />}
            options={knowledgeBases.map((kb) => ({
              value: kb.id,
              label: kb.name,
            }))}
          />
          <button className="new-chat-btn" onClick={handleNewChat}>
            <PlusOutlined />
          </button>
        </div>

        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="no-conversations">
              <p>暂无对话</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conv-item ${currentConversationId === conv.id ? 'active' : ''}`}
                onClick={() => setCurrentConversationId(conv.id)}
              >
                <div className="conv-content">
                  <span className="conv-title">{conv.title}</span>
                  <span className="conv-time">
                    {dayjs(conv.updated_at).format('MM/DD HH:mm')}
                  </span>
                </div>
                <button
                  className="conv-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteConv(conv.id)
                  }}
                >
                  <DeleteOutlined />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <main className="chat-main">
        {!selectedKbId ? (
          <div className="empty-chat">
            <DatabaseOutlined className="empty-icon" />
            <h3>选择一个知识库开始对话</h3>
            <p>从左侧选择知识库，然后开始提问</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-chat">
            <RobotOutlined className="empty-icon" />
            <h3>开始新对话</h3>
            <p>基于「{knowledgeBases.find((k) => k.id === selectedKbId)?.name}」知识库回答问题</p>
          </div>
        ) : (
          <div className="messages-container">
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`message ${msg.role}`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="message-avatar">
                  {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                </div>
                <div className="message-content">
                  <div className="message-text">
                    {msg.content || (
                      <span className="typing-indicator">
                        <span />
                        <span />
                        <span />
                      </span>
                    )}
                  </div>
                  {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                    <div className="message-sources">
                      <button
                        className="sources-toggle"
                        onClick={() =>
                          setExpandedSources(expandedSources === msg.id ? null : msg.id)
                        }
                      >
                        <LinkOutlined />
                        <span>{msg.sources.length} 个引用来源</span>
                      </button>
                      {expandedSources === msg.id && (
                        <div className="sources-list">
                          {msg.sources.map((source, i) => (
                            <div key={i} className="source-item">
                              <div className="source-header">
                                <span className="source-index">[{i + 1}]</span>
                                <Tooltip title={source.url}>
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="source-title"
                                  >
                                    {source.title || source.url}
                                  </a>
                                </Tooltip>
                              </div>
                              <p className="source-text">{source.chunk_text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="chat-input-area">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedKbId ? '输入你的问题...' : '请先选择知识库'}
              disabled={!selectedKbId || isStreaming}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!selectedKbId || !inputValue.trim() || isStreaming}
            >
              <SendOutlined />
            </button>
          </div>
          <p className="input-hint">按 Enter 发送，Shift + Enter 换行</p>
        </div>
      </main>
    </div>
  )
}
