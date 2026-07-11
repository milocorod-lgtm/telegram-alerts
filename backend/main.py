from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from database import (
    get_config,
    init_db,
    list_history,
    save_config,
    save_device_token,
)
from telegram_client import list_dialogs, start_telegram_client, stop_telegram_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    await start_telegram_client()
    yield
    await stop_telegram_client()


app = FastAPI(title="TelegramAlarm Backend", lifespan=lifespan)


@app.get("/api/health")
async def health():
    """Usado por el cron externo para mantener el servicio despierto en Render."""
    return {"status": "ok"}


@app.get("/api/chats")
async def get_chats():
    return await list_dialogs()


class ConfigIn(BaseModel):
    chat_id: str
    chat_name: str
    mode: str  # "all" | "keywords"
    keywords: list[str] = []
    call_text: str = ""


@app.get("/api/config")
async def read_config():
    config = get_config()
    return config or {
        "chat_id": None,
        "chat_name": None,
        "mode": "keywords",
        "keywords": [],
        "call_text": "",
    }


@app.post("/api/config")
async def write_config(body: ConfigIn):
    if body.mode not in ("all", "keywords"):
        raise HTTPException(400, "mode debe ser 'all' o 'keywords'")
    save_config(body.chat_id, body.chat_name, body.mode, body.keywords, body.call_text)
    return {"status": "ok"}


class DeviceIn(BaseModel):
    fcm_token: str


@app.post("/api/device")
async def register_device(body: DeviceIn):
    save_device_token(body.fcm_token)
    return {"status": "ok"}


@app.get("/api/history")
async def read_history():
    return list_history()
