-- ============================================
-- Legacy Table Cleanup (OPTIONAL)
-- ============================================
-- Removes 45 unused tables from previous "Hot Money Solar/Energy" product
-- WARNING: This will permanently delete these tables and their data
-- Only run this if you're 100% sure these tables are not needed

-- Backup first! 
-- Run: pg_dump before executing this script

-- ============================================
-- ENERGY/SOLAR PRODUCT TABLES (Unused)
-- ============================================

DROP TABLE IF EXISTS battery_pricing CASCADE;
DROP TABLE IF EXISTS calculation_cache CASCADE;
DROP TABLE IF EXISTS calculation_constants CASCADE;
DROP TABLE IF EXISTS calculation_formulas CASCADE;
DROP TABLE IF EXISTS collected_market_prices CASCADE;
DROP TABLE IF EXISTS configuration_best_practices CASCADE;
DROP TABLE IF EXISTS configuration_equipment CASCADE;
DROP TABLE IF EXISTS depreciation_schedules CASCADE;
DROP TABLE IF EXISTS energy_price_alerts CASCADE;
DROP TABLE IF EXISTS energy_price_trends CASCADE;
DROP TABLE IF EXISTS equipment_database CASCADE;
DROP TABLE IF EXISTS equipment_templates CASCADE;
DROP TABLE IF EXISTS equipment_vendors CASCADE;
DROP TABLE IF EXISTS ev_charger_catalog CASCADE;
DROP TABLE IF EXISTS financing_options CASCADE;
DROP TABLE IF EXISTS incentive_programs CASCADE;
DROP TABLE IF EXISTS industry_power_profiles CASCADE;
DROP TABLE IF EXISTS iso_market_prices CASCADE;
DROP TABLE IF EXISTS market_data_sources CASCADE;
DROP TABLE IF EXISTS market_pricing_data CASCADE;
DROP TABLE IF EXISTS power_profiles CASCADE;
DROP TABLE IF EXISTS pricing_configurations CASCADE;
DROP TABLE IF EXISTS pricing_history CASCADE;
DROP TABLE IF EXISTS pricing_policies CASCADE;
DROP TABLE IF EXISTS pricing_scenarios CASCADE;
DROP TABLE IF EXISTS product_catalog CASCADE;
DROP TABLE IF EXISTS quote_views CASCADE;
DROP TABLE IF EXISTS recommended_applications CASCADE;
DROP TABLE IF EXISTS regulatory_updates CASCADE;
DROP TABLE IF EXISTS rfq_responses CASCADE;
DROP TABLE IF EXISTS rfqs CASCADE;
DROP TABLE IF EXISTS saved_projects CASCADE;
DROP TABLE IF EXISTS saved_quotes CASCADE;
DROP TABLE IF EXISTS smb_leads CASCADE;
DROP TABLE IF EXISTS smb_sites CASCADE;
DROP TABLE IF EXISTS state_incentives CASCADE;
DROP TABLE IF EXISTS use_case_analytics CASCADE;
DROP TABLE IF EXISTS use_case_configurations CASCADE;
DROP TABLE IF EXISTS use_case_templates CASCADE;
DROP TABLE IF EXISTS use_cases CASCADE;
DROP TABLE IF EXISTS utility_rates CASCADE;
DROP TABLE IF EXISTS vendor_notifications CASCADE;
DROP TABLE IF EXISTS vendor_products CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS wizard_events CASCADE;
DROP TABLE IF EXISTS wizard_sessions CASCADE;

-- ============================================
-- Verify cleanup
-- ============================================
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Expected result: Should only show Hot Money investor/startup tables
-- No energy, solar, or equipment-related tables should appear

-- ============================================
-- IMPORTANT: Run VACUUM manually after cleanup
-- ============================================
-- VACUUM cannot run inside a transaction block.
-- After running this script successfully, run these commands separately:
--
-- VACUUM FULL;
-- ANALYZE;
--
-- This will reclaim disk space from the deleted tables.
