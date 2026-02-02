from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# Knowledge Base
class KnowledgeBaseCreate(BaseModel):
    name: str
    description: str = ""


class KnowledgeBaseResponse(BaseModel):
    id: UUID
    name: str
    description: str
    document_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Document
class DocumentAddRequest(BaseModel):
    urls: List[str]


class DocumentResponse(BaseModel):
    id: UUID
    url: str
    title: str
    status: str
    chunk_count: int
    error_message: str
    created_at: datetime

    class Config:
        from_attributes = True


# Chat
class ChatRequest(BaseModel):
    question: str
    conversation_id: Optional[UUID] = None
    knowledge_base_id: UUID


class SourceItem(BaseModel):
    url: str
    title: str
    chunk_text: str


class ChatMessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    sources: List[SourceItem] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: UUID
    knowledge_base_id: UUID
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Model Config
class ModelConfigCreate(BaseModel):
    type: str  # llm or embedding
    name: str
    base_url: str
    api_key: str = ""
    model_name: str
    is_default: bool = False


class ModelConfigResponse(BaseModel):
    id: UUID
    type: str
    name: str
    base_url: str
    model_name: str
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ModelTestRequest(BaseModel):
    type: str
    base_url: str
    api_key: str
    model_name: str
