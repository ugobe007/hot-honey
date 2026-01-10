-- COMPREHENSIVE RLS FIX
-- Fixes all RLS policy issues identified by Supabase Database Linter
-- Run this AFTER restoring from backup

-- ============================================================
-- PRIORITY 1: CRITICAL TABLES - Enable RLS where policies exist
-- ============================================================

-- startup_uploads - CRITICAL: Has 13 policies but RLS disabled
ALTER TABLE public.startup_uploads ENABLE ROW LEVEL SECURITY;
SELECT '✅ Enabled RLS on startup_uploads' as status;

-- scraper_jobs - Has 7 policies but RLS disabled
ALTER TABLE public.scraper_jobs ENABLE ROW LEVEL SECURITY;
SELECT '✅ Enabled RLS on scraper_jobs' as status;

-- scraper_logs - Has 4 policies but RLS disabled
ALTER TABLE public.scraper_logs ENABLE ROW LEVEL SECURITY;
SELECT '✅ Enabled RLS on scraper_logs' as status;

-- scraper_results - Has 7 policies but RLS disabled
ALTER TABLE public.scraper_results ENABLE ROW LEVEL SECURITY;
SELECT '✅ Enabled RLS on scraper_results' as status;

-- scraper_sources - Has 9 policies but RLS disabled
ALTER TABLE public.scraper_sources ENABLE ROW LEVEL SECURITY;
SELECT '✅ Enabled RLS on scraper_sources' as status;

-- ============================================================
-- PRIORITY 2: PUBLIC TABLES WITHOUT RLS - Enable RLS + Basic Policies
-- ============================================================

-- startup_investor_matches (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'startup_investor_matches'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.startup_investor_matches ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on startup_investor_matches';
  END IF;
END $$;

-- Ensure startup_investor_matches has policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'startup_investor_matches'
  ) THEN
    CREATE POLICY "Allow public read access to matches" 
      ON public.startup_investor_matches FOR SELECT USING (true);
    CREATE POLICY "Allow authenticated insert on matches" 
      ON public.startup_investor_matches FOR INSERT 
      TO authenticated WITH CHECK (true);
    CREATE POLICY "Allow authenticated update on matches" 
      ON public.startup_investor_matches FOR UPDATE 
      TO authenticated USING (true) WITH CHECK (true);
    RAISE NOTICE 'Created policies for startup_investor_matches';
  END IF;
END $$;

-- Enable RLS on all other public tables without it
-- Using a function to handle errors gracefully

DO $$
DECLARE
  tbl RECORD;
  policy_exists BOOLEAN;
BEGIN
  FOR tbl IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'scraper_results',
      'saved_matches',
      'startup_exits',
      'intro_requests',
      'match_reports',
      'funding_rounds',
      'founder_hire_matches',
      'talent_pool',
      'key_variables_tracking',
      'market_intelligence',
      'algorithm_weight_history',
      'ml_recommendations',
      'ai_logs',
      'score_history',
      'investor_connections',
      'startup_recommendations',
      'subscription_plans',
      'startup_subscriptions',
      'sourcing_fees',
      'recommendation_analytics',
      'scraper_selectors',
      'sector_benchmarks',
      'investor_mentions_raw',
      'match_feedback',
      'investor_learned_preferences',
      'metric_definitions',
      'signals',
      'signal_trends',
      'funding_outcomes',
      'data_integrity_snapshots',
      'ecosystem_signals',
      'template_completions',
      'template_recommendations'
    )
    AND NOT rowsecurity  -- Only tables where RLS is disabled
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
      
      -- Check if policies exist
      SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = tbl.tablename
      ) INTO policy_exists;
      
      -- If no policies exist, create basic read policy
      IF NOT policy_exists THEN
        EXECUTE format(
          'CREATE POLICY "Allow public read access" ON public.%I FOR SELECT USING (true)',
          tbl.tablename
        );
        RAISE NOTICE 'Enabled RLS and created read policy for %', tbl.tablename;
      ELSE
        RAISE NOTICE 'Enabled RLS on % (policies already exist)', tbl.tablename;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error processing %: %', tbl.tablename, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================
-- PRIORITY 3: TABLES WITH RLS BUT NO POLICIES - Add Basic Policies
-- ============================================================

-- email_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'email_templates'
  ) THEN
    CREATE POLICY "Allow authenticated read access" 
      ON public.email_templates FOR SELECT 
      TO authenticated USING (true);
    CREATE POLICY "Allow service role full access" 
      ON public.email_templates FOR ALL 
      TO service_role USING (true) WITH CHECK (true);
    RAISE NOTICE 'Created policies for email_templates';
  END IF;
END $$;

-- email_unsubscribes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'email_unsubscribes'
  ) THEN
    CREATE POLICY "Allow authenticated read access" 
      ON public.email_unsubscribes FOR SELECT 
      TO authenticated USING (true);
    CREATE POLICY "Allow authenticated insert access" 
      ON public.email_unsubscribes FOR INSERT 
      TO authenticated WITH CHECK (true);
    RAISE NOTICE 'Created policies for email_unsubscribes';
  END IF;
END $$;

-- outreach_conversions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'outreach_conversions'
  ) THEN
    CREATE POLICY "Allow authenticated read access" 
      ON public.outreach_conversions FOR SELECT 
      TO authenticated USING (true);
    CREATE POLICY "Allow service role full access" 
      ON public.outreach_conversions FOR ALL 
      TO service_role USING (true) WITH CHECK (true);
    RAISE NOTICE 'Created policies for outreach_conversions';
  END IF;
END $$;

-- service_results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'service_results'
  ) THEN
    CREATE POLICY "Allow authenticated read own results" 
      ON public.service_results FOR SELECT 
      TO authenticated USING (auth.uid() = user_id);
    CREATE POLICY "Allow authenticated insert own results" 
      ON public.service_results FOR INSERT 
      TO authenticated WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE 'Created policies for service_results';
  END IF;
END $$;

-- user_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_subscriptions'
  ) THEN
    CREATE POLICY "Allow users read own subscriptions" 
      ON public.user_subscriptions FOR SELECT 
      TO authenticated USING (auth.uid() = user_id);
    CREATE POLICY "Allow service role full access" 
      ON public.user_subscriptions FOR ALL 
      TO service_role USING (true) WITH CHECK (true);
    RAISE NOTICE 'Created policies for user_subscriptions';
  END IF;
END $$;

-- ============================================================
-- VERIFICATION: Check all critical tables have RLS enabled
-- ============================================================

SELECT 
  'VERIFICATION' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN (
    'startup_uploads',
    'startup_investor_matches',
    'investors',
    'scraper_jobs',
    'scraper_logs',
    'scraper_results',
    'scraper_sources',
    'ai_logs',
    'score_history',
    'algorithm_weight_history'
  )
ORDER BY 
  CASE WHEN rowsecurity THEN 1 ELSE 0 END,
  tablename;

-- Success message
SELECT '✅ RLS fixes applied! Check verification results above.' as status;
