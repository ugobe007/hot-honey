# 🗄️ Startup Exits Migration Instructions

## Quick Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase-startup-exits.sql`
4. Paste into SQL Editor
5. Click **Run**

### Option 2: Using psql

```bash
# Get your connection string from Supabase Dashboard → Settings → Database
psql "your-connection-string" -f supabase-startup-exits.sql
```

### Option 3: Using Supabase CLI

```bash
supabase db push
# Or
supabase migration new startup_exits
# Then copy SQL into the migration file
```

---

## What Gets Created

1. **`startup_exits` table** - Stores exit data
2. **Indexes** - For performance
3. **`investor_portfolio_performance` view** - Aggregates exit data
4. **`portfolio_performance` column** - Added to `investors` table (JSONB)

---

## Verify Migration

After running the migration, verify it worked:

```bash
node run-exits-migration.js
```

Or check in Supabase Dashboard:
- Go to **Table Editor**
- Look for `startup_exits` table
- Check `investors` table has `portfolio_performance` column

---

## Troubleshooting

### If table already exists:
The migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times.

### If you get permission errors:
Make sure you're using the **Service Role Key** (not the anon key) for migrations.

### If view creation fails:
The view depends on the table existing first. Make sure `startup_exits` table was created successfully.

---

**Once migration is complete, run:**
```bash
node detect-startup-exits.js
node update-investor-portfolio-performance.js
```





