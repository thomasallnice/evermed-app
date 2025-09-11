# EverMed Database Migration Guide

## 🚀 Quick Start

### For Remote Supabase (Production)

```bash
# 1. Setup environment
./scripts/setup_env.sh

# 2. Apply migrations
./scripts/apply_remote.sh

# 3. Create demo user (optional)
./scripts/create_demo_user.sh
```

## 📁 Migration Files

### Core Migrations

1. **`00_create_base_tables.sql`**
   - Creates all 4 core tables from scratch
   - Adds indexes, triggers, and RLS policies
   - Safe to run multiple times (uses IF NOT EXISTS)

2. **`01_seed_demo_data.sql`**
   - Creates demo family for demo@evermed.ai
   - Adds sample captures, notifications, and insights
   - Margaret Chen has "needs_attention" status

## 🛠️ Scripts

### `apply_remote.sh`
Main migration script for remote Supabase database.

**Features:**
- ✅ Validates database connection
- ✅ Applies migrations in order
- ✅ Verifies table creation
- ✅ Shows migration progress
- ✅ Handles errors gracefully

**Usage:**
```bash
# Run with environment variable
export DATABASE_URL='postgresql://...'
./scripts/apply_remote.sh

# Or let script prompt for URL
./scripts/apply_remote.sh
```

### `setup_env.sh`
Configures your `.env.local` file with Supabase credentials.

**Features:**
- ✅ Interactive setup wizard
- ✅ Backs up existing config
- ✅ Tests Supabase connection
- ✅ Creates .env.example

### `create_demo_user.sh`
Creates or updates the demo user account.

**Features:**
- ✅ Creates demo@evermed.ai user
- ✅ Sets up family members
- ✅ Configures test data

## 🔑 Supabase Project Details

- **Project ID:** `jwarorrwgpqrksrxmesx`
- **Dashboard:** https://app.supabase.com/project/jwarorrwgpqrksrxmesx
- **API URL:** https://jwarorrwgpqrksrxmesx.supabase.co

### Finding Your Credentials

1. **Database URL:**
   - Go to Settings > Database
   - Copy "Connection string" (URI format)
   - Use DIRECT connection for migrations

2. **Anon Key:**
   - Go to Settings > API
   - Copy "anon public" key

3. **Service Role Key:**
   - Go to Settings > API
   - Copy "service_role" key (keep secret!)

## 📊 Database Schema

### Tables Created

#### `family_members`
- User family member profiles
- Status tracking (all_well, needs_attention, unknown)
- AI confidence scores in JSONB

#### `captures`
- Photo/document storage
- AI analysis results
- Tags and metadata

#### `notifications`
- User alerts and reminders
- Priority levels
- Read/dismiss tracking

#### `ai_insights`
- AI-generated insights
- Recommendations
- User feedback

## 🔐 Security

### Row Level Security (RLS)
All tables have RLS enabled with policies:
- Users can only see their own data
- Full CRUD operations on owned records
- No cross-user data access

### Best Practices
- ✅ Always backup before migrations
- ✅ Test on staging first
- ✅ Use connection pooling for apps
- ✅ Use direct connection for migrations
- ❌ Never commit credentials to git

## 🧪 Testing

### After Migration

1. **Check Tables:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

2. **Check Demo Data:**
```sql
SELECT * FROM family_members 
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'demo@evermed.ai'
);
```

3. **Test Login:**
- Email: `demo@evermed.ai`
- Password: `123456`
- Should see Margaret needs attention

## 🚨 Troubleshooting

### Common Issues

#### "Connection refused"
- Check DATABASE_URL format
- Ensure using correct port (5432 or 6543)
- Verify network connectivity

#### "Permission denied"
- Use service_role key for admin operations
- Check RLS policies
- Verify user permissions

#### "Table already exists"
- Normal if running migration again
- Tables use IF NOT EXISTS clause
- Safe to re-run

#### "Demo user not created"
- Create via Supabase Dashboard
- Authentication > Users > Add user
- Set metadata: `{"full_name": "Sarah Chen"}`

### Rollback

If needed, drop all tables:
```sql
DROP TABLE IF EXISTS ai_insights CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS captures CASCADE;
DROP TABLE IF EXISTS family_members CASCADE;
```

## 📈 Migration Status

| Component | Status | Notes |
|-----------|--------|-------|
| Base Tables | ✅ Ready | All 4 tables with indexes |
| RLS Policies | ✅ Ready | Full security coverage |
| Demo Data | ✅ Ready | Sarah Chen family |
| Triggers | ✅ Ready | Auto-update timestamps |
| Functions | ✅ Ready | Helper functions included |

## 🔄 Updates

### Version History
- **v1.0.0** - Initial migration with 4 core tables
- **v1.0.1** - Added demo data seed
- **v1.0.2** - Enhanced RLS policies

### Future Migrations
Place new migration files in `/supabase/migrations/` with format:
- `XX_description.sql` where XX is sequence number
- Will be applied automatically by `apply_remote.sh`

## 📞 Support

### Resources
- [Supabase Docs](https://supabase.com/docs)
- [Project Dashboard](https://app.supabase.com/project/jwarorrwgpqrksrxmesx)
- [Migration Guide](https://supabase.com/docs/guides/cli/migrations)

### Help Commands
```bash
# Show this help
cat scripts/MIGRATION_README.md

# Check migration status
psql $DATABASE_URL -c "\dt"

# View logs
psql $DATABASE_URL -c "SELECT * FROM migrations ORDER BY executed_at DESC LIMIT 10;"
```

---

**Last Updated:** January 2025
**Project:** EverMed Peace of Mind MVP