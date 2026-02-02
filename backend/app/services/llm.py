import logging
from typing import List, Dict, Tuple, AsyncGenerator

from sqlalchemy import select
from openai import AsyncOpenAI

from app.db import async_session
from app.models import ModelConfig
from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """你是一个专业的客服助手，基于以下参考资料回答用户问题。

规则：
- 只基于提供的资料回答，不要编造信息
- 如果资料中没有相关内容，明确告知用户"根据现有资料，暂时无法回答这个问题"
- 回答要简洁、准确、有帮助
- 回答末尾标注引用来源，格式：[1] [2]

参考资料：
{context}
"""


async def _get_llm_config() -> dict:
    """Get the default LLM config from DB, fallback to env settings."""
    async with async_session() as db:
        result = await db.execute(
            select(ModelConfig).where(ModelConfig.type == "llm", ModelConfig.is_default == True)
        )
        config = result.scalar_one_or_none()
        if config:
            return {
                "base_url": config.base_url,
                "api_key": config.api_key,
                "model_name": config.model_name,
            }

    return {
        "base_url": settings.default_llm_base_url,
        "api_key": settings.default_llm_api_key or "",
        "model_name": settings.default_llm_model,
    }


def _build_context(chunks: List[Dict]) -> str:
    """Build context string from retrieved chunks."""
    if not chunks:
        return "（暂无相关参考资料）"

    parts = []
    for i, chunk in enumerate(chunks, 1):
        source = f"[{i}] 来源：{chunk.get('title', '未知')}"
        parts.append(f"{source}\n{chunk['text']}")

    return "\n\n".join(parts)


def _build_messages(
    question: str,
    context_chunks: List[Dict],
    history: List[Tuple[str, str]],
) -> List[Dict]:
    """Build message list for LLM."""
    context = _build_context(context_chunks)
    system_content = SYSTEM_PROMPT.format(context=context)

    messages = [{"role": "system", "content": system_content}]

    # Add history (limit to last 10 turns)
    for role, content in history[-10:]:
        messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": question})

    return messages


async def stream_chat_response(
    question: str,
    context_chunks: List[Dict],
    history: List[Tuple[str, str]] = None,
) -> AsyncGenerator[str, None]:
    """Stream chat response from LLM."""
    if history is None:
        history = []

    config = await _get_llm_config()

    client = AsyncOpenAI(base_url=config["base_url"], api_key=config["api_key"])

    messages = _build_messages(question, context_chunks, history)

    stream = await client.chat.completions.create(
        model=config["model_name"],
        messages=messages,
        stream=True,
        temperature=0.7,
        max_tokens=2000,
    )

    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


async def test_llm_connection(base_url: str, api_key: str, model_name: str) -> str:
    """Test LLM connectivity."""
    client = AsyncOpenAI(base_url=base_url, api_key=api_key)
    response = await client.chat.completions.create(
        model=model_name,
        messages=[{"role": "user", "content": "请回复：连接成功"}],
        max_tokens=10,
    )
    return f"Connection successful. Response: {response.choices[0].message.content}"
