import os

from telethon import TelegramClient, events
from telethon.sessions import StringSession

from database import get_device_token, rules_for_chat, save_history
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
    result = []

    # "Mensajes guardados" (chat contigo mismo): util para PROBAR la alarma,
    # ya que puedes escribirte a ti mismo sin depender de un canal ajeno.
    me = await client.get_me()
    result.append(
        {
            "chat_id": str(me.id),
            "name": "Mensajes guardados (prueba)",
            "is_channel": False,
            "is_group": False,
        }
    )

    for d in dialogs:
        if d.is_channel or d.is_group:
            result.append(
                {
                    "chat_id": str(d.id),
                    "name": d.name,
                    "is_channel": d.is_channel,
                    "is_group": d.is_group,
                }
            )
    return result


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
    # Puede haber VARIAS reglas para el mismo canal; evaluamos todas y disparamos
    # con la primera que haga match (una sola alarma por mensaje).
    rules = rules_for_chat(event.chat_id)
    if not rules:
        return

    text = event.raw_text or ""

    for rule in rules:
        if rule["mode"] == "all":
            keyword = "(todo el chat)"
        else:
            keyword = _matched_keyword(text, rule.get("keywords", []))
            if not keyword:
                continue

        token = get_device_token()
        if not token:
            return

        chat_name = rule.get("chat_name") or ""
        call_text = rule.get("call_text") or ""
        save_history(chat_name, keyword, text[:200])
        send_alarm_push(token, chat_name, keyword, text[:200], call_text)
        return  # una alarma por mensaje
