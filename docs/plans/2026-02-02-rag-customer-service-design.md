# 客服知识库问答系统设计文档

## 定位

基于 RAG 架构的客服知识库问答系统，支持从网页/在线文档抓取知识，Python 后端 + React 前端分离，支持多种 LLM 切换（默认 DeepSeek），Docker Compose 本地部署。

## 核心架构

```
用户提问 → React 前端 → FastAPI 后端
                              ↓
                     Query 改写 & 向量检索
                              ↓
                     相关文档片段召回
                              ↓
                     LLM 生成回答（带引用来源）
                              ↓
                     返回答案 + 参考链接
```

三个核心模块：

- **知识摄入服务** - 爬取网页/在线文档，清洗分块，生成向量存入向量数据库
- **检索服务** - 接收用户问题，向量检索 + 关键词混合检索，召回相关片段
- **问答服务** - 将问题和召回片段交给 LLM，生成带引用来源的回答

存储层：

- **PostgreSQL** - 存储文档元数据、对话记录
- **Qdrant** - 存储文档向量，支持相似度检索

## 功能模块

### 1. 知识管理

- **网页抓取** - 输入 URL 或站点地图，自动爬取页面内容（支持帮助中心、飞书/Notion 公开文档）
- **文档分块** - 按语义段落智能切分，保留标题层级关系
- **知识库 CRUD** - 创建多个知识库，查看文档列表，手动删除/重新同步
- **同步状态** - 展示每个文档的抓取状态（成功/失败/处理中）

### 2. 对话问答

- **多轮对话** - 支持上下文追问
- **引用溯源** - 回答中标注来源文档和链接，用户可点击查看原文
- **流式输出** - SSE 流式返回，打字机效果
- **相关问题推荐** - 回答后推荐 2-3 个相关问题

### 3. 模型配置

- **多模型支持** - OpenAI / 通义千问 / 智谱 / DeepSeek / 本地 Ollama，统一接口
- **后台切换** - 管理页面配置 API Key、base_url、模型名称，支持连通性测试
- **Embedding 模型可选** - 向量化模型支持切换（OpenAI / BGE / 本地模型）

## 技术选型

### 后端

| 组件 | 选型 | 理由 |
|------|------|------|
| Web 框架 | FastAPI | 原生异步，自带 OpenAPI 文档 |
| RAG 框架 | LangChain | 生态丰富，模型切换方便 |
| 网页抓取 | Crawl4AI / BeautifulSoup | 抓取+清洗网页内容 |
| 文档分块 | LangChain Text Splitters | 支持按语义/标题层级切分 |

### 前端

| 组件 | 选型 | 理由 |
|------|------|------|
| 框架 | React + TypeScript | 生态成熟 |
| UI 库 | Ant Design | 组件丰富，适合管理后台 |
| 状态管理 | Zustand | 轻量够用 |

### 基础设施

| 组件 | 选型 | 理由 |
|------|------|------|
| 向量数据库 | Qdrant | 轻量、Docker 友好 |
| 关系数据库 | PostgreSQL | 存文档元数据和对话记录 |
| Embedding 模型 | BGE-M3（默认） | 开源、中文效果好 |
| LLM | DeepSeek（默认） | 性价比高、中文强、兼容 OpenAI 接口 |

## 页面设计

### 管理后台

1. **知识库列表页** - 卡片展示各知识库，显示文档数量、最后同步时间、状态
2. **知识库详情页** - 文档列表 + 添加 URL 入口，支持批量导入，查看分块数和同步状态
3. **模型配置页** - 配置 LLM 和 Embedding 模型参数，支持连通性测试

### 对话界面

4. **聊天页** - 左侧历史会话列表，右侧对话窗口，选择关联知识库后提问，回答附带引用来源卡片，底部推荐相关问题

## 核心流程

### 知识摄入流程

```
用户输入 URL → 后端异步任务启动
    → Crawl4AI 抓取网页内容
    → 清洗 HTML，提取正文和标题
    → LangChain Splitter 按语义分块（约 500 token/块，重叠 50 token）
    → BGE-M3 生成向量
    → 写入 Qdrant（向量）+ PostgreSQL（元数据）
    → 更新文档状态为"已完成"
```

### 问答检索流程

```
用户提问 → 多轮对话上下文拼接
    → Embedding 生成问题向量
    → Qdrant 向量检索 Top-K（默认 5 条）
    → 关键词辅助过滤（提升精度）
    → 组装 Prompt：系统指令 + 召回片段 + 用户问题
    → DeepSeek 流式生成回答
    → 解析引用标记，关联来源文档
    → SSE 流式返回前端
```

### Prompt 模板

```
你是一个专业的客服助手，基于以下参考资料回答用户问题。
规则：
- 只基于提供的资料回答，不要编造信息
- 如果资料中没有相关内容，明确告知用户
- 回答末尾标注引用来源，格式：[1] [2]

参考资料：
{召回的文档片段，带编号}

用户问题：{question}
```

## 项目结构

```
rag-platform/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI 入口
│   │   ├── config.py               # 配置管理
│   │   ├── models/                 # 数据库模型
│   │   │   ├── knowledge_base.py
│   │   │   ├── document.py
│   │   │   └── conversation.py
│   │   ├── api/                    # 路由
│   │   │   ├── knowledge.py        # 知识库 CRUD
│   │   │   ├── chat.py             # 对话问答（SSE）
│   │   │   └── settings.py         # 模型配置
│   │   ├── services/               # 业务逻辑
│   │   │   ├── crawler.py          # 网页抓取
│   │   │   ├── chunker.py          # 文档分块
│   │   │   ├── embedding.py        # 向量化（多模型适配）
│   │   │   ├── retriever.py        # 检索服务
│   │   │   └── llm.py              # LLM 调用（多模型适配）
│   │   └── db/                     # 数据库连接
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── KnowledgeList/      # 知识库列表
│   │   │   ├── KnowledgeDetail/    # 知识库详情
│   │   │   ├── Chat/               # 对话界面
│   │   │   └── Settings/           # 模型配置
│   │   ├── components/             # 公共组件
│   │   ├── services/               # API 调用
│   │   └── stores/                 # Zustand 状态
│   ├── package.json
│   └── Dockerfile
```

## Docker Compose

```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [postgres, qdrant]
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/ragdemo
      - QDRANT_URL=http://qdrant:6333
      - DEFAULT_LLM_BASE_URL=https://api.deepseek.com
      - DEFAULT_LLM_MODEL=deepseek-chat

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]

  postgres:
    image: postgres:16
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      - POSTGRES_DB=ragdemo
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass

  qdrant:
    image: qdrant/qdrant:latest
    ports: ["6333:6333"]
    volumes: [qdrant_data:/qdrant/storage]

volumes:
  postgres_data:
  qdrant_data:
```
