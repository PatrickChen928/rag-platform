import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons'
import { Modal, Input, message } from 'antd'
import { knowledgeApi } from '@/services/api'
import type { KnowledgeBase } from '@/stores'
import dayjs from 'dayjs'
import './KnowledgeList.css'

export default function KnowledgeList() {
  const navigate = useNavigate()
  const [bases, setBases] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '' })

  const fetchBases = async () => {
    try {
      const res = await knowledgeApi.list()
      setBases(res.data)
    } catch {
      message.error('加载知识库失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBases()
  }, [])

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      message.warning('请输入知识库名称')
      return
    }
    try {
      await knowledgeApi.create(formData)
      message.success('创建成功')
      setModalOpen(false)
      setFormData({ name: '', description: '' })
      fetchBases()
    } catch {
      message.error('创建失败')
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这个知识库吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await knowledgeApi.delete(id)
          message.success('删除成功')
          fetchBases()
        } catch {
          message.error('删除失败')
        }
      },
    })
  }

  return (
    <div className="knowledge-list-page">
      <header className="page-header">
        <div className="header-content">
          <h1 className="page-title">知识库</h1>
          <p className="page-subtitle">管理你的知识内容，为 AI 提供问答依据</p>
        </div>
        <button className="create-btn" onClick={() => setModalOpen(true)}>
          <PlusOutlined />
          <span>新建知识库</span>
        </button>
      </header>

      {loading ? (
        <div className="loading-state">
          <div className="loading-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        </div>
      ) : bases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <FileTextOutlined />
          </div>
          <h3>还没有知识库</h3>
          <p>创建你的第一个知识库，开始构建 AI 问答能力</p>
          <button className="create-btn" onClick={() => setModalOpen(true)}>
            <PlusOutlined />
            <span>新建知识库</span>
          </button>
        </div>
      ) : (
        <div className="kb-grid">
          {bases.map((kb, index) => (
            <div
              key={kb.id}
              className="kb-card"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => navigate(`/knowledge/${kb.id}`)}
            >
              <div className="card-header">
                <div className="card-icon">
                  <FileTextOutlined />
                </div>
                <button
                  className="delete-btn"
                  onClick={(e) => handleDelete(e, kb.id)}
                >
                  <DeleteOutlined />
                </button>
              </div>

              <div className="card-body">
                <h3 className="card-title">{kb.name}</h3>
                <p className="card-desc">
                  {kb.description || '暂无描述'}
                </p>
              </div>

              <div className="card-footer">
                <div className="stat">
                  <span className="stat-value">{kb.document_count}</span>
                  <span className="stat-label">文档</span>
                </div>
                <div className="divider" />
                <div className="stat">
                  <span className="stat-label">
                    {dayjs(kb.updated_at).format('MM/DD HH:mm')}
                  </span>
                </div>
              </div>

              <div className="card-glow" />
            </div>
          ))}
        </div>
      )}

      <Modal
        title={null}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        className="create-modal"
        width={480}
        centered
      >
        <div className="modal-content">
          <h2 className="modal-title">新建知识库</h2>
          <p className="modal-subtitle">创建一个新的知识库来组织你的内容</p>

          <div className="form-group">
            <label>名称</label>
            <Input
              placeholder="输入知识库名称"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              size="large"
            />
          </div>

          <div className="form-group">
            <label>描述（可选）</label>
            <Input.TextArea
              placeholder="简要描述这个知识库的用途"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>
              取消
            </button>
            <button className="btn-primary" onClick={handleCreate}>
              创建
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
