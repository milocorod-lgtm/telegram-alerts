import os

import firebase_admin
from firebase_admin import credentials, messaging

_initialized = False


def init_firebase():
    global _initialized
    if _initialized:
        return
    cred_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-service-account.json")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    _initialized = True


def send_alarm_push(fcm_token: str, chat_name: str, keyword: str, message_preview: str):
    """Envia un push data-only: la app decide como mostrarlo (CallKeep), no Android."""
    init_firebase()
    message = messaging.Message(
        data={
            "type": "alarm_trigger",
            "chat_name": chat_name or "",
            "keyword": keyword or "",
            "message_preview": (message_preview or "")[:200],
        },
        token=fcm_token,
        android=messaging.AndroidConfig(
            priority="high",
        ),
    )
    return messaging.send(message)
