from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://raguser:ragpass@localhost:5432/ragdemo"

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection_prefix: str = "kb_"

    # Default LLM
    default_llm_base_url: str = "https://api.deepseek.com"
    default_llm_model: str = "deepseek-chat"
    default_llm_api_key: Optional[str] = None

    # Default Embedding
    default_embedding_model: str = "BAAI/bge-m3"
    default_embedding_base_url: Optional[str] = None
    default_embedding_api_key: Optional[str] = None

    # Chunking
    chunk_size: int = 500
    chunk_overlap: int = 50

    # Retrieval
    top_k: int = 5

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
