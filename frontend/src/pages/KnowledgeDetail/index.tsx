import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  LinkOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  LoadingOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Modal, Input, message, Tooltip } from 'antd'
import { knowledgeApi } from '@/services/api'
import type { KnowledgeBase, Document } from '@/stores'
import dayjs from 'dayjs'
import './KnowledgeDetail.css'

const statusConfig = {
  pending: { icon: <ClockCircleOutlined />, label: '等待处理', color: 'gray' },
  processing: { icon: <LoadingOutlined />, label: '处理中', color: 'blue' },
  completed: { icon: <CheckCircleFilled />, label: '已完成', color: 'green' },
  failed: { icon: <CloseCircleFilled />, label: '失败', color: 'red' },
}

export default function KnowledgeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [kb, setKb] = useState<KnowledgeBase | null>(null)
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [adding, setAdding] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = async () => {
    if (!id) return
    try {
      const [kbRes, docsRes] = await Promise.all([
        knowledgeApi.get(id),
        knowledgeApi.listDocuments(id),
      ])
      setKb(kbRes.data)
      setDocs(docsRes.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [id])

  // Poll for processing documents
  useEffect(() => {
    const hasProcessing = docs.some((d) => d.status === 'processing' || d.status === 'pending')
    if (hasProcessing) {
      pollRef.current = setInterval(fetchData, 3000)
    } else if (pollRef.current) {
      clearInterval(pollRef.current)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [docs])

  const handleAddUrls = async () => {
    if (!urlInput.trim() || !id) return

    const urls = urlInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u && (u.startsWith('http://') || u.startsWith('https://')))

    if (urls.length === 0) {
      message.warning('请输入有效的 URL（以 http:// 或 https:// 开头）')
      return
    }

    setAdding(true)
    try {
      await knowledgeApi.addDocuments(id, urls)
      message.success(`已添加 ${urls.length} 个文档`)
      setModalOpen(false)
      setUrlInput('')
      fetchData()
    } catch {
      message.error('添加失败')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (docId: string) => {
    if (!id) return
    Modal.confirm({
      title: '确认删除',
      content: '删除后该文档的所有内容将被移除',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await knowledgeApi.deleteDocument(id, docId)
          message.success('删除成功')
          fetchData()
        } catch {
          message.error('删除失败')
        }
      },
    })
  }

  if (loading) {
    return (
      <div className="knowledge-detail-page">
        <div className="loading-skeleton">
          <div className="skeleton-header" />
          <div className="skeleton-table" />
        </div>
      </div>
    )
  }

  if (!kb) {
    return (
      <div className="knowledge-detail-page">
        <div className="error-state">知识库不存在</div>
      </div>
    )
  }

  return (
    <div className="knowledge-detail-page">
      <header className="detail-header">
        <button className="back-btn" onClick={() => navigate('/knowledge')}>
          <ArrowLeftOutlined />
        </button>

        <div className="header-info">
          <h1 className="kb-name">{kb.name}</h1>
          <p className="kb-desc">{kb.description || '暂无描述'}</p>
        </div>

        <div className="header-actions">
          <button className="refresh-btn" onClick={fetchData}>
            <ReloadOutlined />
          </button>
          <button className="add-btn" onClick={() => setModalOpen(true)}>
            <PlusOutlined />
            <span>添加文档</span>
          </button>
        </div>
      </header>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">{docs.length}</span>
          <span className="stat-label">总文档</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {docs.filter((d) => d.status === 'completed').length}
          </span>
          <span className="stat-label">已完成</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {docs.reduce((sum, d) => sum + d.chunk_count, 0)}
          </span>
          <span className="stat-label">总分块</span>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="empty-docs">
          <LinkOutlined className="empty-icon" />
          <h3>还没有文档</h3>
          <p>添加网页 URL，系统会自动抓取并处理内容</p>
          <button className="add-btn" onClick={() => setModalOpen(true)}>
            <PlusOutlined />
            <span>添加文档</span>
          </button>
        </div>
      ) : (
        <div className="docs-table">
          <div className="table-header">
            <div className="col-title">文档</div>
            <div className="col-status">状态</div>
            <div className="col-chunks">分块</div>
            <div className="col-time">添加时间</div>
            <div className="col-actions" />
          </div>

          <div className="table-body">
            {docs.map((doc, index) => {
              const status = statusConfig[doc.status]
              return (
                <div
                  key={doc.id}
                  className="table-row"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="col-title">
                    <div className="doc-title">
                      {doc.title || '正在获取标题...'}
                    </div>
                    <a
                      className="doc-url"
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {doc.url}
                    </a>
                  </div>
                  <div className="col-status">
                    <Tooltip title={doc.error_message || status.label}>
                      <span className={`status-badge status-${status.color}`}>
                        {status.icon}
                        <span>{status.label}</span>
                      </span>
                    </Tooltip>
                  </div>
                  <div className="col-chunks">
                    <span className="chunks-value">{doc.chunk_count || '-'}</span>
                  </div>
                  <div className="col-time">
                    {dayjs(doc.created_at).format('MM/DD HH:mm')}
                  </div>
                  <div className="col-actions">
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Modal
        title={null}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        className="add-modal"
        width={560}
        centered
      >
        <div className="modal-content">
          <h2 className="modal-title">添加文档</h2>
          <p className="modal-subtitle">
            输入网页 URL，每行一个，系统将自动抓取内容
          </p>

          <div className="form-group">
            <label>URL 列表</label>
            <Input.TextArea
              placeholder={'https://example.com/page1\nhttps://example.com/page2'}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              rows={6}
              disabled={adding}
            />
          </div>

          <div className="modal-actions">
            <button
              className="btn-secondary"
              onClick={() => setModalOpen(false)}
              disabled={adding}
            >
              取消
            </button>
            <button
              className="btn-primary"
              onClick={handleAddUrls}
              disabled={adding}
            >
              {adding ? <LoadingOutlined /> : null}
              <span>{adding ? '添加中...' : '添加'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
