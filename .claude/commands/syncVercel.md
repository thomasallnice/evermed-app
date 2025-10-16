# /syncVercel - Sync Environment Variables to Vercel

Execute the Vercel environment variable sync script to safely sync .env files to Vercel environments.

## What This Does

This command runs `scripts/sync-vercel-env.sh`, which:

1. Reads environment variables from local .env files (.env.local, .env.staging, .env.production)
2. Syncs them to Vercel using the Vercel CLI (`vercel env add`)
3. **CRITICAL**: Uses `printf` instead of `echo` to avoid newline corruption
4. Removes old variables before adding new ones (prevents conflicts)
5. Skips comments and empty lines
6. Handles quoted values correctly
7. Shows progress and reports sync statistics
8. Optionally verifies synced variables

## Important: echo vs printf

**❌ NEVER DO THIS:**
```bash
echo "$OPENAI_API_KEY" | vercel env add OPENAI_API_KEY production
# This stores: "sk-proj-abc123\n" (WITH NEWLINE) ❌
# API will reject it as invalid!
```

**✅ ALWAYS DO THIS:**
```bash
printf '%s' "$OPENAI_API_KEY" | vercel env add OPENAI_API_KEY production
# This stores: "sk-proj-abc123" (NO NEWLINE) ✅
# API will accept it!
```

The `echo` command adds a newline character (`\n`) by default. When piped to Vercel CLI, this newline becomes part of the stored value, causing authentication failures.

The sync script uses `printf '%s'` exclusively to prevent this bug.

## Usage

Run the slash command:
```
/syncVercel
```

Or run the script directly:
```bash
./scripts/sync-vercel-env.sh
```

## Interactive Prompts

The script will ask:

1. **Which environments to sync?**
   - `1` - Development (.env.local)
   - `2` - Preview/Staging (.env.staging or .env.preview)
   - `3` - Production (.env.production)
   - `4` - All environments

2. **Verify synced variables?** (optional)
   - Shows the values stored in Vercel to confirm they're correct

## Example Output

```
╔══════════════════════════════════════════════════════════════╗
║          Vercel Environment Variable Sync Tool               ║
║                                                              ║
║  ⚠️  CRITICAL: Uses printf to prevent newline corruption   ║
║  Never use echo for syncing - it adds \n to values!        ║
╚══════════════════════════════════════════════════════════════╝

Which environments would you like to sync?
1) Development (.env.local)
2) Preview/Staging (.env.staging or .env.preview)
3) Production (.env.production)
4) All environments

Enter choice (1-4): 4

📁 Syncing .env.local → development
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ DATABASE_URL
  ✓ NEXT_PUBLIC_SUPABASE_URL
  ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
  ✓ SUPABASE_SERVICE_ROLE_KEY
  ✓ ENCRYPTION_KEY
  ✓ OPENAI_API_KEY
✅ 6 variables synced from .env.local

📁 Syncing .env.staging → preview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ DATABASE_URL
  ✓ NEXT_PUBLIC_SUPABASE_URL
  ✓ OPENAI_API_KEY
✅ 3 variables synced from .env.staging

╔══════════════════════════════════════════════════════════════╗
║                      Sync Complete                           ║
╚══════════════════════════════════════════════════════════════╝
✓ Synced:  9 variables
⏭ Skipped: 0 variables

✅ Sync complete! Deploy to apply changes:
   vercel --prod   (for production)
   git push origin dev   (for preview deployment)

⚠️  IMPORTANT REMINDER:
   Never use 'echo' to pipe values to vercel env add
   Always use 'printf' to avoid newline corruption
   This script uses printf exclusively for safety
```

## Prerequisites

- Vercel CLI installed: `npm install -g vercel`
- Authenticated with Vercel: `vercel login`
- Local .env files exist (.env.local, .env.staging, or .env.production)

## When to Use

Use this command whenever you:

1. **Add new environment variables** to .env files
2. **Update existing environment variables** (API keys, secrets, URLs)
3. **Set up a new Vercel project** and need to sync all vars
4. **Experience authentication errors** in Vercel deployment (may indicate corrupted env vars)
5. **Switch between environments** and need to ensure parity

## Troubleshooting

### Script fails with "vercel: command not found"
Install Vercel CLI:
```bash
npm install -g vercel
```

### Script fails with "No access to project"
Authenticate with Vercel:
```bash
vercel login
```

### Variables not taking effect after sync
Trigger a new deployment:
```bash
vercel --prod  # for production
git push origin dev  # for preview
```

### How to verify variables were synced correctly
```bash
vercel env ls development
vercel env ls preview
vercel env ls production
```

### How to manually remove a corrupted variable
```bash
vercel env rm VARIABLE_NAME production
```

Then re-run `/syncVercel` to add it back with the correct value.

## Related Issues

- **Vercel Environment Variable Corruption via echo (2025-10-16)** - Documented in `.claude/memory/active-issues.md`
- **Failed deployment dpl_CxpJe5dv1h1ywZCCx4d5EuXn5oq2** - Caused by echo newline bug

## Files

- **Script**: `scripts/sync-vercel-env.sh`
- **Documentation**: `.claude/memory/active-issues.md` (search for "Vercel Environment Variable Corruption")
- **This slash command**: `.claude/commands/syncVercel.md`
