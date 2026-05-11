"""
Run once to create the profiles table in Supabase.
Usage: python migrate.py
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_PASSWORD = os.getenv("DB_PASSWORD")
PROJECT_REF = "szpitnkoosnovxgpwwts"

if not DB_PASSWORD:
    raise SystemExit("ERROR: DB_PASSWORD is not set in .env")

conn_str = (
    f"host=db.{PROJECT_REF}.supabase.co "
    f"port=5432 "
    f"dbname=postgres "
    f"user=postgres "
    f"password={DB_PASSWORD} "
    f"sslmode=require"
)

SQL = """
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    plan text NOT NULL DEFAULT 'starter',
    stripe_customer_id text,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO authenticated;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'profiles'
          AND policyname = 'Users can read own profile'
    ) THEN
        CREATE POLICY "Users can read own profile"
            ON public.profiles FOR SELECT
            USING (auth.uid() = id);
    END IF;
END
$$;
"""

print("Connecting to Supabase...")
try:
    with psycopg2.connect(conn_str) as conn:
        with conn.cursor() as cur:
            cur.execute(SQL)
        conn.commit()
    print("Migration complete.")
except Exception as e:
    print(f"Migration failed: {e}")
    raise
