from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from database import (
    add_rule,
    clear_all,
    db_status,
    delete_rule,
    init_db,
    list_history,
    list_rules,
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


@app.get("/api/diag")
async def diag():
    """Estado observable del backend: motor de BD (persistente o no),
    si hay token de dispositivo registrado y conteos. Sin secretos."""
    return db_status()


@app.get("/api/chats")
async def get_chats():
    return await list_dialogs()


class RuleIn(BaseModel):
    chat_id: str
    chat_name: str
    mode: str  # "all" | "keywords"
    keywords: list[str] = []
    call_text: str = ""


@app.get("/api/rules")
async def read_rules():
    return list_rules()


@app.post("/api/rules")
async def create_rule(body: RuleIn):
    if body.mode not in ("all", "keywords"):
        raise HTTPException(400, "mode debe ser 'all' o 'keywords'")
    rule_id = add_rule(body.chat_id, body.chat_name, body.mode, body.keywords, body.call_text)
    return {"status": "ok", "id": rule_id}


@app.delete("/api/rules/{rule_id}")
async def remove_rule(rule_id: int):
    delete_rule(rule_id)
    return {"status": "ok"}


@app.post("/api/reset")
async def reset_all():
    """Borrar todo: reglas + historial."""
    clear_all()
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
