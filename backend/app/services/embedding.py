import logging
from typing import List, Optional

from sqlalchemy import select
from app.db import async_session
from app.models import ModelConfig
from app.config import settings

logger = logging.getLogger(__name__)


async def _get_embedding_config():
    """Get the default embedding model config from DB, fallback to env settings."""
    async with async_session() as db:
        result = await db.execute(
            select(ModelConfig).where(ModelConfig.type == "embedding", ModelConfig.is_default == True)
        )
        config = result.scalar_one_or_none()
        if config:
            return {
                "base_url": config.base_url,
                "api_key": config.api_key,
                "model_name": config.model_name,
            }

    return {
        "base_url": settings.default_embedding_base_url,
        "api_key": settings.default_embedding_api_key,
        "model_name": settings.default_embedding_model,
    }


async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of texts."""
    config = await _get_embedding_config()

    # Try OpenAI-compatible API first
    if config["base_url"] and config["api_key"]:
        return await _openai_embeddings(texts, config)

    # Fallback to local sentence-transformers
    return _local_embeddings(texts, config["model_name"])


async def _openai_embeddings(texts: List[str], config: dict) -> List[List[float]]:
    """Use OpenAI-compatible embedding API."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(base_url=config["base_url"], api_key=config["api_key"])
    response = await client.embeddings.create(input=texts, model=config["model_name"])
    return [item.embedding for item in response.data]


def _local_embeddings(texts: List[str], model_name: str) -> List[List[float]]:
    """Use local sentence-transformers model."""
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(model_name, trust_remote_code=True)
    embeddings = model.encode(texts, normalize_embeddings=True)
    return embeddings.tolist()


async def test_embedding_connection(base_url: str, api_key: str, model_name: str) -> str:
    """Test embedding model connectivity."""
    if base_url and api_key:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(base_url=base_url, api_key=api_key)
        response = await client.embeddings.create(input=["test"], model=model_name)
        dim = len(response.data[0].embedding)
        return f"Connection successful. Embedding dimension: {dim}"
    else:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(model_name, trust_remote_code=True)
        emb = model.encode(["test"])
        dim = len(emb[0])
        return f"Local model loaded. Embedding dimension: {dim}"
