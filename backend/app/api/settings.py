from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.db import get_db
from app.models import ModelConfig
from app.schemas import ModelConfigCreate, ModelConfigResponse, ModelTestRequest
from app.services.llm import test_llm_connection
from app.services.embedding import test_embedding_connection

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/models", response_model=List[ModelConfigResponse])
async def list_models(type: str = None, db: AsyncSession = Depends(get_db)):
    query = select(ModelConfig).order_by(ModelConfig.created_at.desc())
    if type:
        query = query.where(ModelConfig.type == type)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/models", response_model=ModelConfigResponse)
async def create_model(data: ModelConfigCreate, db: AsyncSession = Depends(get_db)):
    # If setting as default, unset other defaults of same type
    if data.is_default:
        result = await db.execute(
            select(ModelConfig).where(ModelConfig.type == data.type, ModelConfig.is_default == True)
        )
        for m in result.scalars().all():
            m.is_default = False

    model = ModelConfig(
        type=data.type,
        name=data.name,
        base_url=data.base_url,
        api_key=data.api_key,
        model_name=data.model_name,
        is_default=data.is_default,
    )
    db.add(model)
    await db.commit()
    await db.refresh(model)
    return model


@router.put("/models/{model_id}", response_model=ModelConfigResponse)
async def update_model(model_id: UUID, data: ModelConfigCreate, db: AsyncSession = Depends(get_db)):
    model = await db.get(ModelConfig, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model config not found")

    if data.is_default:
        result = await db.execute(
            select(ModelConfig).where(
                ModelConfig.type == data.type,
                ModelConfig.is_default == True,
                ModelConfig.id != model_id
            )
        )
        for m in result.scalars().all():
            m.is_default = False

    model.name = data.name
    model.base_url = data.base_url
    model.api_key = data.api_key
    model.model_name = data.model_name
    model.is_default = data.is_default
    model.type = data.type

    await db.commit()
    await db.refresh(model)
    return model


@router.delete("/models/{model_id}")
async def delete_model(model_id: UUID, db: AsyncSession = Depends(get_db)):
    model = await db.get(ModelConfig, model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model config not found")
    await db.delete(model)
    await db.commit()
    return {"ok": True}


@router.post("/models/test")
async def test_model(data: ModelTestRequest):
    try:
        if data.type == "llm":
            result = await test_llm_connection(data.base_url, data.api_key, data.model_name)
        else:
            result = await test_embedding_connection(data.base_url, data.api_key, data.model_name)
        return {"ok": True, "message": result}
    except Exception as e:
        return {"ok": False, "message": str(e)}
