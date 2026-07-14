import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

_supabase: Client = None

def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_ANON_KEY", "")
        _supabase = create_client(url, key)
    return _supabase
