import { useState, useEffect } from 'react'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleFilled,
  ApiOutlined,
  RobotOutlined,
  ExperimentOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { Modal, Input, Select, Switch, message } from 'antd'
import { settingsApi } from '@/services/api'
import type { ModelConfig } from '@/stores'
import './Settings.css'

const PRESET_MODELS = {
  llm: [
    { name: 'DeepSeek', base_url: 'https://api.deepseek.com', model_name: 'deepseek-chat' },
    { name: 'OpenAI', base_url: 'https://api.openai.com/v1', model_name: 'gpt-4o' },
    { name: '通义千问', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model_name: 'qwen-turbo' },
    { name: '智谱 AI', base_url: 'https://open.bigmodel.cn/api/paas/v4', model_name: 'glm-4' },
    { name: 'Ollama (本地)', base_url: 'http://localhost:11434/v1', model_name: 'llama3' },
  ],
  embedding: [
    { name: 'OpenAI', base_url: 'https://api.openai.com/v1', model_name: 'text-embedding-3-small' },
    { name: '通义千问', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model_name: 'text-embedding-v3' },
    { name: 'BGE-M3 (本地)', base_url: '', model_name: 'BAAI/bge-m3' },
  ],
}

export default function Settings() {
  const [models, setModels] = useState<ModelConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null)
  const [testing, setTesting] = useState(false)

  const [formData, setFormData] = useState({
    type: 'llm' as 'llm' | 'embedding',
    name: '',
    base_url: '',
    api_key: '',
    model_name: '',
    is_default: false,
  })

  const fetchModels = async () => {
    try {
      const res = await settingsApi.listModels()
      setModels(res.data)
    } catch {
      message.error('加载模型配置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  const resetForm = () => {
    setFormData({
      type: 'llm',
      name: '',
      base_url: '',
      api_key: '',
      model_name: '',
      is_default: false,
    })
  }

  const handleOpenModal = (model?: ModelConfig) => {
    if (model) {
      setEditingModel(model)
      setFormData({
        type: model.type as 'llm' | 'embedding',
        name: model.name,
        base_url: model.base_url,
        api_key: '',
        model_name: model.model_name,
        is_default: model.is_default,
      })
    } else {
      setEditingModel(null)
      resetForm()
    }
    setModalOpen(true)
  }

  const handlePresetSelect = (preset: (typeof PRESET_MODELS.llm)[0]) => {
    setFormData((prev) => ({
      ...prev,
      name: preset.name,
      base_url: preset.base_url,
      model_name: preset.model_name,
    }))
  }

  const handleTest = async () => {
    if (!formData.base_url && formData.type === 'llm') {
      message.warning('请输入 API 地址')
      return
    }

    setTesting(true)
    try {
      const res = await settingsApi.testModel({
        type: formData.type,
        base_url: formData.base_url,
        api_key: formData.api_key,
        model_name: formData.model_name,
      })
      if (res.data.ok) {
        message.success(res.data.message)
      } else {
        message.error(res.data.message)
      }
    } catch {
      message.error('测试失败')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      message.warning('请输入配置名称')
      return
    }

    try {
      if (editingModel) {
        await settingsApi.updateModel(editingModel.id, formData)
        message.success('更新成功')
      } else {
        await settingsApi.createModel(formData)
        message.success('创建成功')
      }
      setModalOpen(false)
      resetForm()
      fetchModels()
    } catch {
      message.error('保存失败')
    }
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '删除配置',
      content: '确定要删除这个模型配置吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await settingsApi.deleteModel(id)
          message.success('删除成功')
          fetchModels()
        } catch {
          message.error('删除失败')
        }
      },
    })
  }

  const llmModels = models.filter((m) => m.type === 'llm')
  const embeddingModels = models.filter((m) => m.type === 'embedding')

  return (
    <div className="settings-page">
      <header className="page-header">
        <div className="header-content">
          <h1 className="page-title">模型配置</h1>
          <p className="page-subtitle">配置 LLM 和 Embedding 模型的 API 连接</p>
        </div>
        <button className="add-btn" onClick={() => handleOpenModal()}>
          <PlusOutlined />
          <span>添加配置</span>
        </button>
      </header>

      <section className="model-section">
        <div className="section-header">
          <RobotOutlined className="section-icon" />
          <h2>LLM 模型</h2>
          <span className="section-count">{llmModels.length}</span>
        </div>

        {llmModels.length === 0 ? (
          <div className="empty-section">
            <p>还没有配置 LLM 模型</p>
          </div>
        ) : (
          <div className="model-grid">
            {llmModels.map((model, index) => (
              <div
                key={model.id}
                className={`model-card ${model.is_default ? 'default' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {model.is_default && (
                  <div className="default-badge">
                    <CheckCircleFilled /> 默认
                  </div>
                )}
                <div className="card-header">
                  <div className="model-icon">
                    <ApiOutlined />
                  </div>
                  <div className="card-actions">
                    <button className="action-btn" onClick={() => handleOpenModal(model)}>
                      <EditOutlined />
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(model.id)}>
                      <DeleteOutlined />
                    </button>
                  </div>
                </div>
                <h3 className="model-name">{model.name}</h3>
                <p className="model-info">{model.model_name}</p>
                <p className="model-url">{model.base_url || '本地模型'}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="model-section">
        <div className="section-header">
          <ExperimentOutlined className="section-icon" />
          <h2>Embedding 模型</h2>
          <span className="section-count">{embeddingModels.length}</span>
        </div>

        {embeddingModels.length === 0 ? (
          <div className="empty-section">
            <p>还没有配置 Embedding 模型，将使用默认的 BGE-M3</p>
          </div>
        ) : (
          <div className="model-grid">
            {embeddingModels.map((model, index) => (
              <div
                key={model.id}
                className={`model-card ${model.is_default ? 'default' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {model.is_default && (
                  <div className="default-badge">
                    <CheckCircleFilled /> 默认
                  </div>
                )}
                <div className="card-header">
                  <div className="model-icon embedding">
                    <ExperimentOutlined />
                  </div>
                  <div className="card-actions">
                    <button className="action-btn" onClick={() => handleOpenModal(model)}>
                      <EditOutlined />
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(model.id)}>
                      <DeleteOutlined />
                    </button>
                  </div>
                </div>
                <h3 className="model-name">{model.name}</h3>
                <p className="model-info">{model.model_name}</p>
                <p className="model-url">{model.base_url || '本地模型'}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        title={null}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        className="model-modal"
        width={520}
        centered
      >
        <div className="modal-content">
          <h2 className="modal-title">
            {editingModel ? '编辑配置' : '添加模型配置'}
          </h2>

          <div className="form-group">
            <label>类型</label>
            <Select
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value })}
              options={[
                { value: 'llm', label: 'LLM (对话模型)' },
                { value: 'embedding', label: 'Embedding (向量模型)' },
              ]}
              className="form-select"
            />
          </div>

          <div className="form-group">
            <label>快速选择</label>
            <div className="preset-list">
              {PRESET_MODELS[formData.type].map((preset) => (
                <button
                  key={preset.name}
                  className={`preset-btn ${formData.name === preset.name ? 'active' : ''}`}
                  onClick={() => handlePresetSelect(preset)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>配置名称</label>
            <Input
              placeholder="例如：DeepSeek"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>API 地址</label>
            <Input
              placeholder="https://api.deepseek.com"
              value={formData.base_url}
              onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>API Key</label>
            <Input.Password
              placeholder="sk-..."
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>模型名称</label>
            <Input
              placeholder="deepseek-chat"
              value={formData.model_name}
              onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
            />
          </div>

          <div className="form-group inline">
            <label>设为默认</label>
            <Switch
              checked={formData.is_default}
              onChange={(checked) => setFormData({ ...formData, is_default: checked })}
            />
          </div>

          <div className="modal-actions">
            <button className="btn-test" onClick={handleTest} disabled={testing}>
              {testing ? <LoadingOutlined /> : null}
              <span>{testing ? '测试中...' : '测试连接'}</span>
            </button>
            <div className="action-right">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>
                取消
              </button>
              <button className="btn-primary" onClick={handleSave}>
                保存
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
