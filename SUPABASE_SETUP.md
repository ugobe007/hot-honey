# 🗄️ Supabase Integration Setup

This guide will help you set up Supabase to automatically store and manage StartupCard data.

## 🚀 Quick Setup (5 minutes)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name**: hot-money-honey
   - **Database Password**: (save this!)
   - **Region**: Choose closest to you
4. Wait 2-3 minutes for setup

### 2. Run Database Migration

1. In your Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the entire contents of `supabase/migrations/001_create_startups_table.sql`
4. Paste into the SQL editor
5. Click **"Run"**
6. You should see: ✅ Success. No rows returned

### 3. Get Your API Keys

1. Click **Settings** (gear icon) > **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - **Keep this secret!**

### 4. Add Environment Variables

#### Frontend (.env in root folder):
```bash
# Create/edit .env file in /hot-money-honey/
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

#### Backend (server/.env):
```bash
# Add to /hot-money-honey/server/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
OPENAI_API_KEY=sk-proj-... # (your existing key)
```

### 5. Restart Your Servers

```bash
# Kill existing servers
pkill -9 node

# Start backend
cd /Users/robertchristopher/hot-money-honey
node server/index.js &

# Start frontend (in new terminal)
npm run dev
```

## ✨ How It Works

### Automatic Workflow:

1. **Process URLs** → AI scrapes startup data
2. **Auto-save to Supabase** → Data stored in cloud database
3. **Review Dashboard** → View all startups from Supabase
4. **One-click Export** → Generate code from validated startups
5. **Deploy** → Push changes to production

### No More Manual Copy/Paste! 🎉

- ✅ Startups automatically saved to database
- ✅ Review and validate in dashboard
- ✅ Export only validated startups
- ✅ Sync across team members
- ✅ Version control and history

## 📊 Database Schema

```sql
startups
├── id (text) - Unique startup ID
├── name (text) - Company name
├── tagline (text) - One-line description
├── pitch (text) - Problem statement
├── five_points (text[]) - Array of 5 key points
├── secret_fact (text) - Fun fact
├── logo (text) - Logo URL
├── website (text) - Company website
├── validated (boolean) - Admin approved?
├── scraped_at (timestamptz) - When scraped
├── created_at (timestamptz) - When added to DB
└── updated_at (timestamptz) - Last modified
```

## 🔧 Verification

Test your setup:

```bash
# In browser console (F12) on your site:
import { supabase } from './src/lib/supabaseClient';
const { data } = await supabase.from('startups').select('*');
console.log(data);
```

Should return your startups array!

## 🆘 Troubleshooting

### "Invalid API key"
- Check that you copied the full key (should be very long)
- Anon key for frontend, service key for backend
- Restart servers after adding .env variables

### "relation public.startups does not exist"
- Run the SQL migration in Supabase SQL Editor
- Check that the query completed successfully

### "Row Level Security policy violation"
- Make sure RLS policies were created in migration
- Check Supabase Dashboard > Authentication > Policies

## 🎯 Next Steps

1. ✅ Complete setup above
2. Process some startup URLs
3. Check Supabase Dashboard > Table Editor > startups
4. See data automatically appear!
5. Use Review Dashboard to validate and export

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [PostgreSQL Arrays](https://www.postgresql.org/docs/current/arrays.html)
