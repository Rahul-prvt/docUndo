"""Smoke tests for dependency combinations that pip metadata cannot validate."""


def test_supabase_and_supafunc_import_together():
    from supafunc.utils import DEFAULT_FUNCTION_CLIENT_TIMEOUT
    from supabase import create_client

    assert DEFAULT_FUNCTION_CLIENT_TIMEOUT > 0
    assert callable(create_client)
    client = create_client(
        "https://example.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.c2lnbmF0dXJl",
    )
    assert client is not None
