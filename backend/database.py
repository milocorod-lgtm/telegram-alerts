import json
import os
import sqlite3
import threading
from datetime import datetime, timezone

# --- Selección de motor -----------------------------------------------------
# Si existe DATABASE_URL (Postgres, p. ej. Neon), se usa esa base PERSISTENTE.
# Si no, se cae a SQLite local (disco efímero en Render: se borra al reiniciar).
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
USE_PG = bool(DATABASE_URL)

DB_PATH = "telegramalarm.db"
_lock = threading.Lock()

if USE_PG:
    import psycopg2
    import psycopg2.extras

    # Neon exige TLS; si la URL no lo trae, lo forzamos.
    if "sslmode=" not in DATABASE_URL:
        sep = "&" if "?" in DATABASE_URL else "?"
        DATABASE_URL = f"{DATABASE_URL}{sep}sslmode=require"

    PH = "%s"  # placeholder de parámetros en psycopg2

    def _connect():
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
        conn.autocommit = False
        return conn
else:
    PH = "?"  # placeholder de parámetros en sqlite3

    def _connect():
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn


def init_db():
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        if USE_PG:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS rules (
                    id SERIAL PRIMARY KEY,
                    chat_id TEXT NOT NULL,
                    chat_name TEXT,
                    mode TEXT NOT NULL DEFAULT 'keywords',
                    keywords TEXT NOT NULL DEFAULT '[]',
                    call_text TEXT NOT NULL DEFAULT ''
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS device (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    fcm_token TEXT
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS history (
                    id SERIAL PRIMARY KEY,
                    chat_name TEXT,
                    keyword_matched TEXT,
                    message_preview TEXT,
                    triggered_at TEXT NOT NULL
                )
            """)
        else:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chat_id TEXT NOT NULL,
                    chat_name TEXT,
                    mode TEXT NOT NULL DEFAULT 'keywords',
                    keywords TEXT NOT NULL DEFAULT '[]',
                    call_text TEXT NOT NULL DEFAULT ''
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS device (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    fcm_token TEXT
                )
            """)
            cur.execute("""
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


def _row_to_rule(row):
    return {
        "id": row["id"],
        "chat_id": row["chat_id"],
        "chat_name": row["chat_name"],
        "mode": row["mode"],
        "keywords": json.loads(row["keywords"]),
        "call_text": row["call_text"],
    }


def list_rules():
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        cur.execute("SELECT * FROM rules ORDER BY id ASC")
        rows = cur.fetchall()
        conn.close()
    return [_row_to_rule(r) for r in rows]


def rules_for_chat(chat_id):
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        cur.execute(f"SELECT * FROM rules WHERE chat_id = {PH}", (str(chat_id),))
        rows = cur.fetchall()
        conn.close()
    return [_row_to_rule(r) for r in rows]


def add_rule(chat_id, chat_name, mode, keywords, call_text=""):
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        if USE_PG:
            cur.execute(
                f"""
                INSERT INTO rules (chat_id, chat_name, mode, keywords, call_text)
                VALUES ({PH}, {PH}, {PH}, {PH}, {PH}) RETURNING id
                """,
                (str(chat_id), chat_name, mode, json.dumps(keywords), call_text),
            )
            rule_id = cur.fetchone()["id"]
        else:
            cur.execute(
                f"""
                INSERT INTO rules (chat_id, chat_name, mode, keywords, call_text)
                VALUES ({PH}, {PH}, {PH}, {PH}, {PH})
                """,
                (str(chat_id), chat_name, mode, json.dumps(keywords), call_text),
            )
            rule_id = cur.lastrowid
        conn.commit()
        conn.close()
    return rule_id


def delete_rule(rule_id):
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM rules WHERE id = {PH}", (rule_id,))
        conn.commit()
        conn.close()


def clear_all():
    """Borrar todo: reglas + historial (el token del dispositivo se conserva)."""
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        cur.execute("DELETE FROM rules")
        cur.execute("DELETE FROM history")
        conn.commit()
        conn.close()


def get_device_token():
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        cur.execute("SELECT fcm_token FROM device WHERE id = 1")
        row = cur.fetchone()
        conn.close()
    return row["fcm_token"] if row else None


def save_device_token(token):
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        cur.execute(
            f"""
            INSERT INTO device (id, fcm_token) VALUES (1, {PH})
            ON CONFLICT(id) DO UPDATE SET fcm_token = EXCLUDED.fcm_token
            """,
            (token,),
        )
        conn.commit()
        conn.close()


def save_history(chat_name, keyword, message_preview):
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        cur.execute(
            f"""
            INSERT INTO history (chat_name, keyword_matched, message_preview, triggered_at)
            VALUES ({PH}, {PH}, {PH}, {PH})
            """,
            (chat_name, keyword, message_preview, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
        conn.close()


def list_history(limit=50):
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        cur.execute(f"SELECT * FROM history ORDER BY id DESC LIMIT {PH}", (limit,))
        rows = cur.fetchall()
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
