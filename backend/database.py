import json
import os
import sqlite3
import threading
from datetime import datetime, timezone

# --- Selección de motor -----------------------------------------------------
# Prioridad de almacenamiento PERSISTENTE:
#   1) Firestore (Firebase) — reutiliza las credenciales que ya usa el push,
#      NO exige otra cuenta ni copiar contraseñas. Es el modo recomendado.
#   2) Postgres (DATABASE_URL, p. ej. Neon) — si se prefiere una BD SQL.
#   3) SQLite local — SOLO respaldo; en Render el disco es EFÍMERO y se borra
#      al reiniciar (por eso las reglas "se borraban solas").
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
USE_PG = bool(DATABASE_URL)

DB_PATH = "telegramalarm.db"
_lock = threading.Lock()

# Firestore se resuelve en init_db() (hace una lectura de prueba para confirmar
# que la base está habilitada en la consola de Firebase). Hasta entonces, False.
USE_FS = False
_fs = None
_FS_INIT_ERROR = ""

try:
    import firebase_admin
    from firebase_admin import credentials
    from firebase_admin import firestore as _firestore

    _FIREBASE_OK = True
except Exception as _imp_err:  # noqa: BLE001
    _FIREBASE_OK = False
    _FS_INIT_ERROR = f"firebase-admin no disponible: {_imp_err}"

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


def _firestore_enabled_by_env():
    val = os.environ.get("USE_FIRESTORE", "1").strip().lower()
    return val not in ("0", "false", "no", "off", "")


# ============================================================================
#  Inicialización: elige Firestore si está disponible; si no, crea tablas SQL.
# ============================================================================
def init_db():
    global USE_FS, _fs, _FS_INIT_ERROR

    if _FIREBASE_OK and _firestore_enabled_by_env():
        try:
            # Reutiliza la app de firebase-admin (la misma del push). Si aún no
            # se inicializó, la inicializamos con el mismo service account.
            if not firebase_admin._apps:
                cred_path = os.environ.get(
                    "FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-service-account.json"
                )
                firebase_admin.initialize_app(credentials.Certificate(cred_path))
            _fs = _firestore.client()
            # Lectura de prueba: confirma que Firestore está HABILITADO en la
            # consola de Firebase. Si no lo está, esto lanza y caemos a SQL.
            list(_fs.collection("meta").limit(1).stream())
            USE_FS = True
            return
        except Exception as e:  # noqa: BLE001
            _FS_INIT_ERROR = str(e)
            USE_FS = False
            _fs = None

    # --- Respaldo SQL (Postgres o SQLite) ---
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        id_type = "SERIAL PRIMARY KEY" if USE_PG else "INTEGER PRIMARY KEY AUTOINCREMENT"
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS rules (
                id {id_type},
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
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS history (
                id {id_type},
                chat_name TEXT,
                keyword_matched TEXT,
                message_preview TEXT,
                triggered_at TEXT NOT NULL
            )
        """)
        conn.commit()
        conn.close()


# ============================================================================
#  Helpers Firestore
# ============================================================================
def _fs_next_id(kind):
    """Contador incremental (id numérico) para reglas/historial. Serializado
    por _lock; en Render free tier hay una sola instancia, así que basta."""
    ref = _fs.collection("meta").document("counters")
    snap = ref.get()
    data = snap.to_dict() or {}
    key = f"next_{kind}_id"
    nxt = int(data.get(key, 1))
    ref.set({key: nxt + 1}, merge=True)
    return nxt


def _fs_doc_to_rule(doc):
    d = doc.to_dict() or {}
    return {
        "id": d.get("id"),
        "chat_id": d.get("chat_id"),
        "chat_name": d.get("chat_name"),
        "mode": d.get("mode"),
        "keywords": d.get("keywords") or [],
        "call_text": d.get("call_text") or "",
    }


# ============================================================================
#  Reglas
# ============================================================================
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
    if USE_FS:
        rules = [_fs_doc_to_rule(d) for d in _fs.collection("rules").stream()]
        rules.sort(key=lambda r: (r["id"] is None, r["id"]))
        return rules
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        cur.execute("SELECT * FROM rules ORDER BY id ASC")
        rows = cur.fetchall()
        conn.close()
    return [_row_to_rule(r) for r in rows]


def rules_for_chat(chat_id):
    if USE_FS:
        cid = str(chat_id)
        # Filtramos en Python (pocas reglas): evita índices/where deprecado.
        return [
            r for r in (_fs_doc_to_rule(d) for d in _fs.collection("rules").stream())
            if r["chat_id"] == cid
        ]
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        cur.execute(f"SELECT * FROM rules WHERE chat_id = {PH}", (str(chat_id),))
        rows = cur.fetchall()
        conn.close()
    return [_row_to_rule(r) for r in rows]


def add_rule(chat_id, chat_name, mode, keywords, call_text=""):
    if USE_FS:
        with _lock:
            rid = _fs_next_id("rule")
            _fs.collection("rules").document(str(rid)).set({
                "id": rid,
                "chat_id": str(chat_id),
                "chat_name": chat_name,
                "mode": mode,
                "keywords": list(keywords or []),
                "call_text": call_text or "",
            })
        return rid
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
    if USE_FS:
        with _lock:
            _fs.collection("rules").document(str(rule_id)).delete()
        return
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM rules WHERE id = {PH}", (rule_id,))
        conn.commit()
        conn.close()


def clear_all():
    """Borrar todo: reglas + historial (el token del dispositivo se conserva)."""
    if USE_FS:
        with _lock:
            for d in _fs.collection("rules").stream():
                d.reference.delete()
            for d in _fs.collection("history").stream():
                d.reference.delete()
        return
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        cur.execute("DELETE FROM rules")
        cur.execute("DELETE FROM history")
        conn.commit()
        conn.close()


# ============================================================================
#  Dispositivo (token FCM)
# ============================================================================
def get_device_token():
    if USE_FS:
        snap = _fs.collection("device").document("current").get()
        data = snap.to_dict() or {}
        return data.get("fcm_token")
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        cur.execute("SELECT fcm_token FROM device WHERE id = 1")
        row = cur.fetchone()
        conn.close()
    return row["fcm_token"] if row else None


def save_device_token(token):
    if USE_FS:
        with _lock:
            _fs.collection("device").document("current").set({"fcm_token": token})
        return
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


# ============================================================================
#  Historial
# ============================================================================
def save_history(chat_name, keyword, message_preview):
    if USE_FS:
        with _lock:
            hid = _fs_next_id("history")
            _fs.collection("history").document(str(hid)).set({
                "id": hid,
                "chat_name": chat_name,
                "keyword_matched": keyword,
                "message_preview": message_preview,
                "triggered_at": datetime.now(timezone.utc).isoformat(),
            })
        return
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
    if USE_FS:
        docs = (
            _fs.collection("history")
            .order_by("id", direction=_firestore.Query.DESCENDING)
            .limit(limit)
            .stream()
        )
        out = []
        for d in docs:
            data = d.to_dict() or {}
            out.append({
                "id": data.get("id"),
                "chat_name": data.get("chat_name"),
                "keyword_matched": data.get("keyword_matched"),
                "message_preview": data.get("message_preview"),
                "triggered_at": data.get("triggered_at"),
            })
        return out
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


# ============================================================================
#  Diagnóstico (solo lectura, sin secretos)
# ============================================================================
def db_status():
    if USE_FS:
        rules_n = sum(1 for _ in _fs.collection("rules").stream())
        hist_n = sum(1 for _ in _fs.collection("history").stream())
        token = get_device_token()
        return {
            "db_mode": "firestore",
            "persistent": True,
            "has_device_token": bool(token),
            "rules_count": rules_n,
            "history_count": hist_n,
        }
    with _lock:
        conn = _connect()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) AS n FROM rules")
        rules_n = cur.fetchone()["n"]
        cur.execute("SELECT COUNT(*) AS n FROM history")
        hist_n = cur.fetchone()["n"]
        cur.execute("SELECT fcm_token FROM device WHERE id = 1")
        row = cur.fetchone()
        conn.close()
    token = row["fcm_token"] if row else None
    status = {
        "db_mode": "postgres" if USE_PG else "sqlite",
        "persistent": bool(USE_PG),
        "has_device_token": bool(token),
        "rules_count": rules_n,
        "history_count": hist_n,
    }
    # Si Firestore estaba previsto pero falló, lo exponemos para diagnosticar
    # (p. ej. "Firestore no habilitado en la consola").
    if _FS_INIT_ERROR:
        status["firestore_error"] = _FS_INIT_ERROR[:300]
    return status
