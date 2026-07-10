import json
import sqlite3
import threading
from datetime import datetime, timezone

DB_PATH = "telegramalarm.db"
_lock = threading.Lock()


def _connect():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with _lock:
        conn = _connect()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                chat_id TEXT,
                chat_name TEXT,
                mode TEXT NOT NULL DEFAULT 'keywords',
                keywords TEXT NOT NULL DEFAULT '[]',
                call_text TEXT NOT NULL DEFAULT ''
            )
        """)
        # Migracion segura: si la tabla ya existia sin la columna, agregarla.
        try:
            conn.execute("ALTER TABLE config ADD COLUMN call_text TEXT NOT NULL DEFAULT ''")
        except sqlite3.OperationalError:
            pass  # la columna ya existe
        conn.execute("""
            CREATE TABLE IF NOT EXISTS device (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                fcm_token TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_name TEXT,
                keyword_matched TEXT,
                message_preview TEXT,
                triggered_at TEXT NOT NULL
            )
        """)
        conn.commit()
        conn.close()


def get_config():
    with _lock:
        conn = _connect()
        row = conn.execute("SELECT * FROM config WHERE id = 1").fetchone()
        conn.close()
    if not row:
        return None
    return {
        "chat_id": row["chat_id"],
        "chat_name": row["chat_name"],
        "mode": row["mode"],
        "keywords": json.loads(row["keywords"]),
        "call_text": row["call_text"] if "call_text" in row.keys() else "",
    }


def save_config(chat_id: str, chat_name: str, mode: str, keywords: list, call_text: str = ""):
    with _lock:
        conn = _connect()
        conn.execute(
            """
            INSERT INTO config (id, chat_id, chat_name, mode, keywords, call_text)
            VALUES (1, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                chat_id = excluded.chat_id,
                chat_name = excluded.chat_name,
                mode = excluded.mode,
                keywords = excluded.keywords,
                call_text = excluded.call_text
            """,
            (chat_id, chat_name, mode, json.dumps(keywords), call_text),
        )
        conn.commit()
        conn.close()


def get_device_token():
    with _lock:
        conn = _connect()
        row = conn.execute("SELECT fcm_token FROM device WHERE id = 1").fetchone()
        conn.close()
    return row["fcm_token"] if row else None


def save_device_token(token: str):
    with _lock:
        conn = _connect()
        conn.execute(
            """
            INSERT INTO device (id, fcm_token) VALUES (1, ?)
            ON CONFLICT(id) DO UPDATE SET fcm_token = excluded.fcm_token
            """,
            (token,),
        )
        conn.commit()
        conn.close()


def save_history(chat_name: str, keyword: str, message_preview: str):
    with _lock:
        conn = _connect()
        conn.execute(
            """
            INSERT INTO history (chat_name, keyword_matched, message_preview, triggered_at)
            VALUES (?, ?, ?, ?)
            """,
            (chat_name, keyword, message_preview, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
        conn.close()


def list_history(limit: int = 50):
    with _lock:
        conn = _connect()
        rows = conn.execute(
            "SELECT * FROM history ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        conn.close()
    return [
        {
            "id": r["id"],
            "chat_name": r["chat_name"],
            "keyword_matched": r["keyword_matched"],
            "message_preview": r["message_preview"],
            "triggered_at": r["triggered_at"],
        }
        for r in rows
    ]
