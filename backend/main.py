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


@app.get("/api/debug/test-push")
async def debug_test_push():
    """Diagnostico temporal: intenta enviar un push al dispositivo registrado
    y devuelve el resultado o el error EXACTO de Firebase."""
    from database import get_config, get_device_token
    from push import send_alarm_push

    token = get_device_token()
    if not token:
        return {"ok": False, "stage": "token", "error": "No hay dispositivo registrado (fcm_token vacio)"}
    config = get_config() or {}
    call_text = config.get("call_text") or ""
    try:
        message_id = send_alarm_push(
            token, "PRUEBA", "XAUUSD SELL", "Mensaje de prueba de diagnostico", call_text
        )
        return {"ok": True, "message_id": message_id, "call_text": call_text, "token_preview": token[:20] + "..."}
    except Exception as e:
        return {"ok": False, "stage": "fcm_send", "error": f"{type(e).__name__}: {e}"}
