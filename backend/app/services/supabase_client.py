"""
VELTRIX SCADA API — Supabase Client Singleton
"""
from app.config import settings

_supabase = None


def get_supabase():
    global _supabase
    if _supabase is None:
        from supabase import create_client, Client
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _supabase
