-- ============================================
-- Migration Function Setup
-- ============================================
-- Run this ONCE in Supabase SQL Editor to enable
-- code-based migrations
-- ============================================

-- Step 1: Create migrations tracking table
CREATE TABLE IF NOT EXISTS public._migrations (
    name text PRIMARY KEY,
    executed_at timestamptz DEFAULT now(),
    sql_hash text
);

-- Step 2: Enable pg_net extension (for HTTP requests if needed)
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 3: Create function to execute migration SQL
-- This function safely executes SQL statements
CREATE OR REPLACE FUNCTION public.execute_migration_sql(sql_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    statement text;
    statements text[];
BEGIN
    -- Split SQL into statements (basic split on semicolon)
    statements := string_to_array(sql_text, ';');
    
    result := jsonb_build_object('executed', 0, 'errors', jsonb_build_array());
    
    -- Execute each statement
    FOREACH statement IN ARRAY statements
    LOOP
        -- Skip empty statements and comments
        IF trim(statement) = '' OR trim(statement) ~ '^--' THEN
            CONTINUE;
        END IF;
        
        BEGIN
            -- Execute the statement
            EXECUTE statement;
            result := jsonb_set(
                result,
                '{executed}',
                to_jsonb((result->>'executed')::int + 1)
            );
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue (for idempotent operations)
            -- Some errors are expected (like "already exists")
            IF SQLSTATE != '42P07' AND SQLSTATE != '42710' AND SQLSTATE != '42P16' THEN
                -- Not a "already exists" error, log it
                result := jsonb_set(
                    result,
                    '{errors}',
                    (result->'errors') || jsonb_build_object(
                        'statement', substring(statement, 1, 100),
                        'error', SQLERRM
                    )
                );
            END IF;
        END;
    END LOOP;
    
    RETURN result;
END;
$$;

-- Step 4: Grant execute permission
GRANT EXECUTE ON FUNCTION public.execute_migration_sql(text) TO authenticated, anon;

-- Step 5: Create helper function to mark migration complete
CREATE OR REPLACE FUNCTION public.mark_migration_complete(migration_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public._migrations (name, executed_at)
    VALUES (migration_name, now())
    ON CONFLICT (name) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_migration_complete(text) TO authenticated, anon;

-- Step 6: Verify functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('execute_migration_sql', 'mark_migration_complete');

-- ============================================
-- Usage from code:
-- ============================================
-- const { data } = await supabase.rpc('execute_migration_sql', {
--   sql_text: 'CREATE TABLE IF NOT EXISTS...'
-- });
-- ============================================
