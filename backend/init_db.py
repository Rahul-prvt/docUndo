"""Database initialization script — prints schema SQL for Supabase SQL Editor."""

import os
import sys


SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "schema.sql")


def init_database():
    """Read schema.sql and print it for pasting into the Supabase SQL Editor."""
    try:
        schema_path = os.path.abspath(SCHEMA_PATH)
        with open(schema_path, "r", encoding="utf-8") as f:
            sql = f.read()

        print("\nCopy the SQL below and run it in your Supabase SQL Editor:")
        print("  https://supabase.com/dashboard → your project → SQL Editor → New query")
        print("=" * 80)
        print(sql)
        print("=" * 80)
        print("\nSteps:")
        print("  1. Go to https://supabase.com/dashboard")
        print("  2. Open your project → SQL Editor → New query")
        print("  3. Paste the SQL above")
        print("  4. Click Run (or Ctrl+Enter)")
        print("\nThe script is idempotent — safe to re-run at any time.")

    except FileNotFoundError:
        print(f"schema.sql not found at: {os.path.abspath(SCHEMA_PATH)}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    init_database()
