from telethon.sync import TelegramClient
from telethon.sessions import StringSession

api_id = input("Pega tu API_ID (numero): ").strip()
api_hash = input("Pega tu API_HASH: ").strip()

with TelegramClient(StringSession(), int(api_id), api_hash) as client:
    print("\n=== TU SESSION STRING (guardalo, es como una contrasena) ===")
    print(client.session.save())
    print("==============================================================\n")
