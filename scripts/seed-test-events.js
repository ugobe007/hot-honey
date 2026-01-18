// Seed test events to verify metrics endpoints
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

const testEvents = [
  { event_name: 'pricing_viewed', source: 'web', page: '/pricing', properties: { source: 'enable_email_alerts' } },
  { event_name: 'pricing_viewed', source: 'web', page: '/pricing', properties: { source: 'export_csv' } },
  { event_name: 'pricing_viewed', source: 'web', page: '/pricing', properties: { source: 'export_csv' } },
  { event_name: 'pricing_viewed', source: 'web', page: '/pricing', properties: { source: 'deal_memo' } },
  { event_name: 'upgrade_cta_clicked', source: 'web', properties: { source: 'export_csv', plan: 'elite' } },
  { event_name: 'upgrade_cta_clicked', source: 'web', properties: { source: 'enable_email_alerts', plan: 'elite' } },
  { event_name: 'upgrade_started', source: 'web', properties: { source: 'export_csv', plan: 'elite' } },
  { event_name: 'upgrade_completed', source: 'server', properties: { source: 'export_csv', plan_new: 'elite' } },
  { event_name: 'alert_created', source: 'server', properties: {} },
  { event_name: 'alert_created', source: 'server', properties: {} },
  { event_name: 'email_sent', source: 'server', properties: {} },
  { event_name: 'email_sent', source: 'server', properties: {} },
  { event_name: 'email_clicked', source: 'server', properties: {} },
  { event_name: 'share_opened', source: 'web', properties: {} },
  { event_name: 'match_viewed', source: 'web', properties: {} },
  { event_name: 'match_viewed', source: 'web', properties: {} },
  { event_name: 'match_viewed', source: 'web', properties: {} },
  { event_name: 'match_viewed', source: 'web', properties: {} },
  { event_name: 'match_viewed', source: 'web', properties: {} },
];

async function seed() {
  const { data, error } = await supabase.from('events').insert(testEvents);
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Seeded', testEvents.length, 'test events');
  }
}

seed();
