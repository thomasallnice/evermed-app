# Claude Code Custom Commands

This directory contains custom slash commands for Claude Code to streamline common workflows.

## Available Commands

### `/frontend`

**Purpose:** Start Next.js development server on port 3200 as a background task.

**What it does:**
- Checks for existing server on port 3200 and kills it
- Starts fresh development server on port 3200
- Runs in background (non-blocking)
- Provides bash_id for monitoring

**Usage:**
```
/frontend
```

**Monitoring:**
- Server runs on http://localhost:3200
- Check output with BashOutput tool using provided bash_id
- Look for "Ready in Xms" message to confirm startup

**Notes:**
- Uses port 3200 to avoid conflicts with other services
- Ideal for running frontend while working on backend/database
- Server continues running until manually stopped

---

### `/project:deploy-staging [commit-message]`

**Purpose:** Deploy to Vercel staging environment with full validation and database sync.

**What it does:**
- Validates code quality (lint, typecheck, tests)
- Invokes pr-validation-orchestrator subagent for pre-deployment checks
- Merges current branch to `staging`
- Applies database migrations to staging Supabase project
- Pushes to GitHub to trigger Vercel deployment
- Validates deployment success

**Usage:**
```
/project:deploy-staging
/project:deploy-staging "Add new feature X"
```

**Requirements:**
- Git repository with `staging` branch
- Supabase CLI installed and configured
- Vercel CLI installed (for monitoring)
- Environment: Staging Supabase project (`jwarorrwgpqrksrxmesx`)

**Best Practices:**
1. Always run from `dev` branch
2. Ensure all changes are committed
3. Let validation complete before forcing deployment
4. Apply database migrations before code deployment
5. Verify deployment success before considering it complete

---

### `/project:deploy-production [release-version]`

**Purpose:** Deploy to Vercel production environment with maximum safety and validation.

**⚠️ WARNING:** This deploys to PRODUCTION. Use with extreme caution.

**What it does:**
- Validates staging deployment is healthy
- Runs comprehensive code quality checks (all must pass)
- Invokes multiple subagents for thorough validation
- Requires THREE explicit user confirmations
- Merges staging to `main` branch
- Creates release tag for version tracking
- Applies database migrations to production Supabase project
- Pushes to GitHub to trigger Vercel production deployment
- Validates production deployment immediately
- Sets up monitoring and provides rollback instructions

**Usage:**
```
/project:deploy-production
/project:deploy-production v2025.01.5
```

**Requirements:**
- Staging deployment must be tested and healthy
- All code quality checks must pass (cannot skip)
- Manual database backup recommended
- Team available for monitoring
- Low-traffic deployment window (recommended)

**Safety Features:**
1. ✅ Multiple validation layers (cannot bypass)
2. ✅ Three explicit confirmations required
3. ✅ Validates staging health first
4. ✅ Multiple subagent validations
5. ✅ Release tagging for tracking
6. ✅ Emergency rollback procedure
7. ✅ Post-deployment monitoring setup
8. ✅ Database backup recommendations
9. ✅ No direct feature branch → production
10. ✅ Comprehensive health checks

**CRITICAL:** Always test thoroughly on staging before production!

---

## How to Use Custom Commands

1. **Type `/` in Claude Code** to open the slash commands menu
2. **Select a command** from the list or start typing its name
3. **Add arguments** if the command supports `$ARGUMENTS`
4. **Press Enter** to execute

## Command Structure

Commands are Markdown files that contain:
- Clear instructions for Claude Code
- Step-by-step workflow
- Error handling procedures
- User interaction points (asking for clarification)
- Subagent invocations when needed
- Best practices and notes

## Creating New Commands

To add a new command:

1. Create a `.md` file in `.claude/commands/`
2. Use descriptive filename (e.g., `deploy-production.md`)
3. Include `$ARGUMENTS` placeholder for parameters
4. Document the workflow clearly
5. Add error handling and user prompts
6. Commit to git so team can use it

**Example command structure:**
```markdown
# Command Title

Brief description of what this command does.

**Usage:** `/project:command-name [args]`

## Workflow

### Step 1: Do something
Instructions for Claude Code...

### Step 2: Handle errors
If X happens, ask user: "..."

### Step 3: Complete
Final steps...
```

## Tips

- Commands can invoke subagents using the Task tool
- Always ask for user confirmation on destructive operations
- Provide clear progress updates
- Handle errors gracefully with user prompts
- Document environment-specific details

## Team Usage

These commands are checked into git, so the entire team can use them. Anyone can:
- Use existing commands via `/project:command-name`
- Add new commands by creating `.md` files
- Modify commands via pull requests
- Share commands across projects by copying files

## Personal Commands

For personal commands you don't want to share, create them in `~/.claude/commands/` (your home directory). These won't be committed to git.
