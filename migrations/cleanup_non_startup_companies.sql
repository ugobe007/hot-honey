-- Cleanup Non-Startup Companies
-- Identifies established companies (GitHub, Google, Microsoft, etc.) that are NOT startups

-- STEP 1: Preview companies that should be filtered (run this first)
-- This shows companies that match known public/mature company patterns
SELECT 
  id,
  name,
  tagline,
  status,
  website,
  CASE
    WHEN name ILIKE ANY(ARRAY[
      '%github%', '%google%', '%microsoft%', '%apple%', '%amazon%', '%meta%', '%facebook%',
      '%netflix%', '%oracle%', '%ibm%', '%intel%', '%salesforce%', '%adobe%', '%nvidia%',
      '%twitter%', '%x corp%', '%uber%', '%airbnb%', '%slack%', '%stripe%', '%shopify%',
      '%zoom%', '%dropbox%', '%linkedin%', '%reddit%', '%pinterest%', '%spotify%',
      '%paypal%', '%ebay%', '%yahoo%', '%tesla%', '%snapchat%', '%snap%', '%lyft%',
      '%doordash%', '%coinbase%', '%robinhood%', '%palantir%', '%snowflake%', '%datadog%',
      '%cloudflare%', '%okta%', '%twilio%', '%docusign%', '%atlassian%', '%zendesk%',
      '%gitlab%', '%mongodb%', '%elastic%', '%splunk%', '%servicenow%', '%workday%',
      '%autodesk%', '%intuit%', '%square%', '%block%', '%hubspot%', '%asana%',
      '%monday.com%', '%indeed%', '%glassdoor%', '%yelp%', '%tripadvisor%', '%booking.com%',
      '%expedia%', '%zillow%', '%redfin%', '%opendoor%', '%carvana%', '%peloton%',
      '%fitbit%', '%gopro%', '%sonos%', '%roku%', '%pandora%', '%soundcloud%', '%tiktok%',
      '%bytedance%', '%discord%', '%roblox%', '%unity%', '%electronic arts%', '%ea%'
    ]) THEN 'Public/Mature Company (name match)'
    WHEN tagline ILIKE ANY(ARRAY[
      '%NYSE:%', '%NASDAQ:%', '%IPO%', '%publicly traded%', '%ticker%', '%stock symbol%',
      '%Fortune 500%', '%Fortune 100%', '%S&P 500%', '%listed on%', '%trades on%',
      '%market cap%', '%market capitalization%', '%shareholder%', '%dividend%'
    ]) THEN 'Public Company (keywords)'
    WHEN name IN (
      'GitHub', 'Google', 'Microsoft', 'Apple', 'Amazon', 'Meta', 'Facebook',
      'Netflix', 'Oracle', 'IBM', 'Intel', 'Salesforce', 'Adobe', 'Nvidia',
      'Twitter', 'Uber', 'Airbnb', 'Slack', 'Stripe', 'Shopify', 'Zoom',
      'Dropbox', 'LinkedIn', 'Reddit', 'Pinterest', 'Spotify', 'PayPal',
      'eBay', 'Yahoo', 'Tesla', 'Snapchat', 'Snap', 'Lyft', 'DoorDash',
      'Coinbase', 'Robinhood', 'Palantir', 'Snowflake', 'Atlassian', 'GitLab',
      'MongoDB', 'Elastic', 'Splunk', 'Twilio', 'DocuSign', 'Zendesk', 'HubSpot'
    ) THEN 'Known Public Company (exact match)'
    ELSE 'Other'
  END as filter_reason
FROM startup_uploads
WHERE status = 'approved'
  AND (
    name ILIKE ANY(ARRAY[
      '%github%', '%google%', '%microsoft%', '%apple%', '%amazon%', '%meta%', '%facebook%',
      '%netflix%', '%oracle%', '%ibm%', '%intel%', '%salesforce%', '%adobe%', '%nvidia%',
      '%twitter%', '%x corp%', '%uber%', '%airbnb%', '%slack%', '%stripe%', '%shopify%',
      '%zoom%', '%dropbox%', '%linkedin%', '%reddit%', '%pinterest%', '%spotify%',
      '%paypal%', '%ebay%', '%yahoo%', '%tesla%', '%snapchat%', '%snap%', '%lyft%',
      '%doordash%', '%coinbase%', '%robinhood%', '%palantir%', '%snowflake%', '%datadog%',
      '%cloudflare%', '%okta%', '%twilio%', '%docusign%', '%atlassian%', '%zendesk%',
      '%gitlab%', '%mongodb%', '%elastic%', '%splunk%', '%servicenow%', '%workday%',
      '%autodesk%', '%intuit%', '%square%', '%block%', '%hubspot%', '%asana%',
      '%monday.com%', '%indeed%', '%glassdoor%', '%yelp%', '%tripadvisor%', '%booking.com%',
      '%expedia%', '%zillow%', '%redfin%', '%opendoor%', '%carvana%', '%peloton%',
      '%fitbit%', '%gopro%', '%sonos%', '%roku%', '%pandora%', '%soundcloud%', '%tiktok%',
      '%bytedance%', '%discord%', '%roblox%', '%unity%', '%electronic arts%', '%ea%'
    ])
    OR name IN (
      'GitHub', 'Google', 'Microsoft', 'Apple', 'Amazon', 'Meta', 'Facebook',
      'Netflix', 'Oracle', 'IBM', 'Intel', 'Salesforce', 'Adobe', 'Nvidia',
      'Twitter', 'Uber', 'Airbnb', 'Slack', 'Stripe', 'Shopify', 'Zoom',
      'Dropbox', 'LinkedIn', 'Reddit', 'Pinterest', 'Spotify', 'PayPal',
      'eBay', 'Yahoo', 'Tesla', 'Snapchat', 'Snap', 'Lyft', 'DoorDash',
      'Coinbase', 'Robinhood', 'Palantir', 'Snowflake', 'Atlassian', 'GitLab',
      'MongoDB', 'Elastic', 'Splunk', 'Twilio', 'DocuSign', 'Zendesk', 'HubSpot'
    )
    OR tagline ILIKE ANY(ARRAY[
      '%NYSE:%', '%NASDAQ:%', '%IPO%', '%publicly traded%', '%ticker%', '%stock symbol%',
      '%Fortune 500%', '%Fortune 100%', '%S&P 500%', '%listed on%', '%trades on%',
      '%market cap%', '%market capitalization%', '%shareholder%', '%dividend%'
    ])
  )
ORDER BY name;

-- STEP 2: Count how many will be marked as rejected
SELECT COUNT(*) as companies_to_reject
FROM startup_uploads
WHERE status = 'approved'
  AND (
    name ILIKE ANY(ARRAY[
      '%github%', '%google%', '%microsoft%', '%apple%', '%amazon%', '%meta%', '%facebook%',
      '%netflix%', '%oracle%', '%ibm%', '%intel%', '%salesforce%', '%adobe%', '%nvidia%',
      '%twitter%', '%x corp%', '%uber%', '%airbnb%', '%slack%', '%stripe%', '%shopify%',
      '%zoom%', '%dropbox%', '%linkedin%', '%reddit%', '%pinterest%', '%spotify%',
      '%paypal%', '%ebay%', '%yahoo%', '%tesla%', '%snapchat%', '%snap%', '%lyft%',
      '%doordash%', '%coinbase%', '%robinhood%', '%palantir%', '%snowflake%', '%datadog%',
      '%cloudflare%', '%okta%', '%twilio%', '%docusign%', '%atlassian%', '%zendesk%',
      '%gitlab%', '%mongodb%', '%elastic%', '%splunk%', '%servicenow%', '%workday%',
      '%autodesk%', '%intuit%', '%square%', '%block%', '%hubspot%', '%asana%',
      '%monday.com%', '%indeed%', '%glassdoor%', '%yelp%', '%tripadvisor%', '%booking.com%',
      '%expedia%', '%zillow%', '%redfin%', '%opendoor%', '%carvana%', '%peloton%',
      '%fitbit%', '%gopro%', '%sonos%', '%roku%', '%pandora%', '%soundcloud%', '%tiktok%',
      '%bytedance%', '%discord%', '%roblox%', '%unity%', '%electronic arts%', '%ea%'
    ])
    OR name IN (
      'GitHub', 'Google', 'Microsoft', 'Apple', 'Amazon', 'Meta', 'Facebook',
      'Netflix', 'Oracle', 'IBM', 'Intel', 'Salesforce', 'Adobe', 'Nvidia',
      'Twitter', 'Uber', 'Airbnb', 'Slack', 'Stripe', 'Shopify', 'Zoom',
      'Dropbox', 'LinkedIn', 'Reddit', 'Pinterest', 'Spotify', 'PayPal',
      'eBay', 'Yahoo', 'Tesla', 'Snapchat', 'Snap', 'Lyft', 'DoorDash',
      'Coinbase', 'Robinhood', 'Palantir', 'Snowflake', 'Atlassian', 'GitLab',
      'MongoDB', 'Elastic', 'Splunk', 'Twilio', 'DocuSign', 'Zendesk', 'HubSpot'
    )
    OR tagline ILIKE ANY(ARRAY[
      '%NYSE:%', '%NASDAQ:%', '%IPO%', '%publicly traded%', '%ticker%', '%stock symbol%',
      '%Fortune 500%', '%Fortune 100%', '%S&P 500%', '%listed on%', '%trades on%',
      '%market cap%', '%market capitalization%', '%shareholder%', '%dividend%'
    ])
  );

-- STEP 3: Mark non-startup companies as rejected
-- Run this after reviewing STEP 1 and STEP 2
UPDATE startup_uploads
SET 
  status = 'rejected',
  admin_notes = COALESCE(admin_notes || ' | ', '') || 'Auto-rejected: Public/Mature company (cleanup script)'
WHERE status = 'approved'
  AND (
    name ILIKE ANY(ARRAY[
      '%github%', '%google%', '%microsoft%', '%apple%', '%amazon%', '%meta%', '%facebook%',
      '%netflix%', '%oracle%', '%ibm%', '%intel%', '%salesforce%', '%adobe%', '%nvidia%',
      '%twitter%', '%x corp%', '%uber%', '%airbnb%', '%slack%', '%stripe%', '%shopify%',
      '%zoom%', '%dropbox%', '%linkedin%', '%reddit%', '%pinterest%', '%spotify%',
      '%paypal%', '%ebay%', '%yahoo%', '%tesla%', '%snapchat%', '%snap%', '%lyft%',
      '%doordash%', '%coinbase%', '%robinhood%', '%palantir%', '%snowflake%', '%datadog%',
      '%cloudflare%', '%okta%', '%twilio%', '%docusign%', '%atlassian%', '%zendesk%',
      '%gitlab%', '%mongodb%', '%elastic%', '%splunk%', '%servicenow%', '%workday%',
      '%autodesk%', '%intuit%', '%square%', '%block%', '%hubspot%', '%asana%',
      '%monday.com%', '%indeed%', '%glassdoor%', '%yelp%', '%tripadvisor%', '%booking.com%',
      '%expedia%', '%zillow%', '%redfin%', '%opendoor%', '%carvana%', '%peloton%',
      '%fitbit%', '%gopro%', '%sonos%', '%roku%', '%pandora%', '%soundcloud%', '%tiktok%',
      '%bytedance%', '%discord%', '%roblox%', '%unity%', '%electronic arts%', '%ea%'
    ])
    OR name IN (
      'GitHub', 'Google', 'Microsoft', 'Apple', 'Amazon', 'Meta', 'Facebook',
      'Netflix', 'Oracle', 'IBM', 'Intel', 'Salesforce', 'Adobe', 'Nvidia',
      'Twitter', 'Uber', 'Airbnb', 'Slack', 'Stripe', 'Shopify', 'Zoom',
      'Dropbox', 'LinkedIn', 'Reddit', 'Pinterest', 'Spotify', 'PayPal',
      'eBay', 'Yahoo', 'Tesla', 'Snapchat', 'Snap', 'Lyft', 'DoorDash',
      'Coinbase', 'Robinhood', 'Palantir', 'Snowflake', 'Atlassian', 'GitLab',
      'MongoDB', 'Elastic', 'Splunk', 'Twilio', 'DocuSign', 'Zendesk', 'HubSpot'
    )
    OR tagline ILIKE ANY(ARRAY[
      '%NYSE:%', '%NASDAQ:%', '%IPO%', '%publicly traded%', '%ticker%', '%stock symbol%',
      '%Fortune 500%', '%Fortune 100%', '%S&P 500%', '%listed on%', '%trades on%',
      '%market cap%', '%market capitalization%', '%shareholder%', '%dividend%'
    ])
  );

-- STEP 4: Verify cleanup (should return 0 or very few)
SELECT name, status, admin_notes
FROM startup_uploads
WHERE name ILIKE '%github%' 
   OR name ILIKE '%google%'
   OR name ILIKE '%microsoft%'
ORDER BY name;
