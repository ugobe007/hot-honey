# Fix Dashboard Stale Count Issue

## Problem
- Database table `startup_investor_matches` is **EMPTY** (0 rows)
- But dashboard shows **350,800 matches**
- SQL queries with service role return 0
- Dashboard queries same table but shows different count

## Root Cause
The dashboard is likely:
1. **Connected to a different Supabase project** (different database)
2. **Showing cached/stale data** from browser
3. **Using wrong environment variables** pointing to different instance

## Solution Steps

### 1. Check Environment Variables
Verify which Supabase project the frontend is connecting to:

```bash
# Check .env file
cat .env | grep SUPABASE

# Should show:
# VITE_SUPABASE_URL=https://unkpogyhhjbvxxjvmxlt.supabase.co
# VITE_SUPABASE_ANON_KEY=...
```

### 2. Check Browser Console
Open browser dev tools → Console → Network tab:
- Reload the Matching Engine Admin page
- Look for API calls to Supabase
- Check what URL it's hitting
- Check the response from the count query

### 3. Hard Refresh Dashboard
- **Chrome/Edge**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- **Firefox**: `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows)
- **Safari**: `Cmd+Option+R`

### 4. Clear Browser Cache
```javascript
// Run in browser console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 5. Verify Actual Count
Run this in browser console on the dashboard page:
```javascript
// Check what Supabase actually returns
const { data, count, error } = await supabase
  .from('startup_investor_matches')
  .select('*', { count: 'exact', head: true });
console.log('Actual count from Supabase:', count);
console.log('Error:', error);
```

### 6. Check Supabase Project
Go to Supabase Dashboard → Settings → API:
- Verify the project URL matches your `.env` file
- Check if you have multiple projects
- Verify you're querying the correct database

## Expected Result
After fixing, dashboard should show **0 matches** (since table is empty).

## Next Steps After Fix
Once dashboard shows correct count (0):
1. Run queue processor to generate actual matches
2. Matches will use the NEW scoring algorithm (better distribution)
3. Distribution will show across all quality tiers (Poor, Fair, Good, Excellent)
