# RAG 知识库问答系统

基于 RAG（检索增强生成）架构的客服知识库问答系统，支持从网页抓取知识，智能问答并提供引用来源。

## 功能特性

- **知识库管理** - 创建多个知识库，添加网页 URL 自动抓取内容
- **智能问答** - 基于 RAG 检索相关内容，LLM 生成准确回答
- **引用溯源** - 回答附带引用来源，可查看原文片段
- **多轮对话** - 支持上下文连续追问
- **流式输出** - SSE 实时响应，打字机效果
- **多模型支持** - 支持 DeepSeek / OpenAI / 通义千问 / 智谱等，可在线切换

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python, FastAPI, LangChain, SQLAlchemy |
| 前端 | React, TypeScript, Ant Design, Zustand |
| 向量数据库 | Qdrant |
| 关系数据库 | PostgreSQL |
| 网页抓取 | Crawl4AI, BeautifulSoup |
| LLM | DeepSeek (默认), OpenAI 兼容接口 |
| Embedding | BGE-M3 (本地) / OpenAI |
| 容器化 | Docker Compose |

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd rag-platform
```

### 2. 配置环境变量

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，填入你的 API Key：

```env
DEFAULT_LLM_API_KEY=your-deepseek-api-key
```

### 3. 启动服务

```bash
docker compose up -d
```

首次启动需要下载镜像和安装依赖，请耐心等待。

### 4. 访问应用

- 前端界面: http://localhost:3000
- 后端 API 文档: http://localhost:8000/docs

## 使用指南

### 创建知识库

1. 进入「知识库」页面
2. 点击「新建知识库」
3. 输入名称和描述

### 添加文档

1. 进入知识库详情页
2. 点击「添加文档」
3. 输入网页 URL（每行一个）
4. 系统自动抓取、分块、向量化

### 开始问答

1. 进入「对话」页面
2. 选择知识库
3. 输入问题，开始对话

### 配置模型

1. 进入「设置」页面
2. 添加 LLM 或 Embedding 模型配置
3. 填入 API 地址和 Key
4. 可设置为默认模型

## 项目结构

```
rag-platform/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置管理
│   │   ├── schemas.py           # Pydantic 模型
│   │   ├── models/              # 数据库模型
│   │   ├── api/                 # API 路由
│   │   │   ├── knowledge.py     # 知识库接口
│   │   │   ├── chat.py          # 对话接口
│   │   │   └── settings.py      # 设置接口
│   │   ├── services/            # 业务逻辑
│   │   │   ├── crawler.py       # 网页抓取
│   │   │   ├── chunker.py       # 文档分块
│   │   │   ├── embedding.py     # 向量化
│   │   │   ├── retriever.py     # 检索服务
│   │   │   └── llm.py           # LLM 调用
│   │   └── db/                  # 数据库连接
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/               # 页面组件
│   │   │   ├── KnowledgeList/   # 知识库列表
│   │   │   ├── KnowledgeDetail/ # 知识库详情
│   │   │   ├── Chat/            # 对话界面
│   │   │   └── Settings/        # 模型配置
│   │   ├── components/          # 公共组件
│   │   ├── services/            # API 调用
│   │   └── stores/              # 状态管理
│   ├── package.json
│   └── Dockerfile
└── docs/
    └── plans/                   # 设计文档
```

## API 接口

### 知识库

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/knowledge/bases | 获取知识库列表 |
| POST | /api/knowledge/bases | 创建知识库 |
| GET | /api/knowledge/bases/{id} | 获取知识库详情 |
| DELETE | /api/knowledge/bases/{id} | 删除知识库 |
| GET | /api/knowledge/bases/{id}/documents | 获取文档列表 |
| POST | /api/knowledge/bases/{id}/documents | 添加文档 |
| DELETE | /api/knowledge/bases/{id}/documents/{doc_id} | 删除文档 |

### 对话

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/chat/conversations | 获取对话列表 |
| GET | /api/chat/conversations/{id}/messages | 获取消息历史 |
| POST | /api/chat/ask | 发送问题 (SSE) |
| DELETE | /api/chat/conversations/{id} | 删除对话 |

### 设置

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/settings/models | 获取模型配置列表 |
| POST | /api/settings/models | 创建模型配置 |
| PUT | /api/settings/models/{id} | 更新模型配置 |
| DELETE | /api/settings/models/{id} | 删除模型配置 |
| POST | /api/settings/models/test | 测试模型连接 |

## 常用命令

```bash
# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f

# 查看后端日志
docker compose logs -f backend

# 停止服务
docker compose down

# 停止并清除数据
docker compose down -v

# 重建后端
docker compose build backend --no-cache
docker compose up -d backend
```

## 支持的模型

### LLM

| 模型 | API 地址 | 模型名称 |
|------|----------|----------|
| DeepSeek | https://api.deepseek.com | deepseek-chat |
| OpenAI | https://api.openai.com/v1 | gpt-4o |
| 通义千问 | https://dashscope.aliyuncs.com/compatible-mode/v1 | qwen-turbo |
| 智谱 AI | https://open.bigmodel.cn/api/paas/v4 | glm-4 |
| Ollama | http://localhost:11434/v1 | llama3 |

### Embedding

| 模型 | API 地址 | 模型名称 |
|------|----------|----------|
| BGE-M3 (本地) | - | BAAI/bge-m3 |
| OpenAI | https://api.openai.com/v1 | text-embedding-3-small |
| 通义千问 | https://dashscope.aliyuncs.com/compatible-mode/v1 | text-embedding-v3 |

## License

MIT
