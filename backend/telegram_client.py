import os

from telethon import TelegramClient, events
from telethon.sessions import StringSession

from database import get_config, get_device_token, save_history
from push import send_alarm_push

API_ID = int(os.environ["TELEGRAM_API_ID"])
API_HASH = os.environ["TELEGRAM_API_HASH"]
SESSION_STRING = os.environ["TELEGRAM_SESSION_STRING"]

client = TelegramClient(StringSession(SESSION_STRING), API_ID, API_HASH)


async def start_telegram_client():
    await client.connect()
    if not await client.is_user_authorized():
        raise RuntimeError(
            "La sesion de Telegram no esta autorizada. Vuelve a correr login_telegram.py "
            "y actualiza TELEGRAM_SESSION_STRING."
        )
    client.add_event_handler(_on_new_message, events.NewMessage())


async def stop_telegram_client():
    await client.disconnect()


async def list_dialogs():
    dialogs = await client.get_dialogs()
    return [
        {
            "chat_id": str(d.id),
            "name": d.name,
            "is_channel": d.is_channel,
            "is_group": d.is_group,
        }
        for d in dialogs
        if d.is_channel or d.is_group
    ]


def _normalize(s: str) -> str:
    """Colapsa cualquier secuencia de espacios/tabs/saltos de linea en un solo
    espacio. Asi 'XAUUSD  SELL' (doble espacio) o 'XAUUSD\\nSELL' (en dos
    renglones) coinciden con la keyword 'XAUUSD SELL'."""
    return " ".join(s.split())


def _matched_keyword(text: str, keywords: list):
    lower = _normalize(text).lower()
    for kw in keywords:
        if kw and _normalize(kw).lower() in lower:
            return kw
    return None


async def _on_new_message(event):
    config = get_config()
    if not config or not config.get("chat_id"):
        return
    if str(event.chat_id) != str(config["chat_id"]):
        return

    text = event.raw_text or ""

    if config["mode"] == "all":
        keyword = "(todo el chat)"
    else:
        keyword = _matched_keyword(text, config.get("keywords", []))
        if not keyword:
            return

    token = get_device_token()
    if not token:
        return

    chat_name = config.get("chat_name") or ""
    save_history(chat_name, keyword, text[:200])
    send_alarm_push(token, chat_name, keyword, text[:200])
