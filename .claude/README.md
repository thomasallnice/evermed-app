# .claude Directory

This directory contains Claude Code 2.0 memory files and standard operating procedures (SOPs).

## Structure

```
.claude/
├── memory/                    # Persistent context across sessions
│   ├── project-state.md      # Current phase, completion status, next steps
│   ├── recent-changes.md     # Last 3-5 major changes with dates
│   └── active-issues.md      # Known bugs, blockers, tech debt
│
├── sops/                      # Standard Operating Procedures
│   ├── database-changes.md   # How to modify schema, run migrations
│   ├── api-endpoints.md      # How to create/modify API routes
│   ├── testing.md            # How to write tests, run smoke tests
│   └── deployment.md         # How to deploy to staging/production
│
├── config.json.example        # MCP server configuration template
└── README.md                  # This file
```

## Memory Files

Memory files are **automatically loaded** by Claude Code at the start of each session. They provide:
- Current project state and completion status
- Recent changes and their context
- Active issues requiring attention

**These files MUST be updated proactively as part of completing work.**

## Standard Operating Procedures (SOPs)

SOPs document how to perform common development tasks correctly. They include:
- Step-by-step workflows
- Common mistakes to avoid
- Examples and templates
- When to use which subagent

**Reference these SOPs when performing the documented tasks.**

## Chrome DevTools MCP Configuration

To enable Chrome DevTools MCP server:

1. Copy `config.json.example` to `config.json`:
   ```bash
   cp .claude/config.json.example .claude/config.json
   ```

2. Claude Code will automatically load the MCP server on startup

3. Available tools include:
   - Input automation (click, fill, drag)
   - Navigation (navigate_page, new_page)
   - Performance tracing (start_trace, analyze_insight)
   - Network inspection (list_network_requests)
   - Debugging (list_console_messages, take_screenshot)

See `../CLAUDE.md` for complete Chrome DevTools MCP documentation.

## Maintenance

### When to Update Memory Files

**After any significant work:**
- Update `recent-changes.md` with what was done
- Update `project-state.md` with new completion status
- Update `active-issues.md` with new issues or resolved ones

**When discovering patterns:**
- Update or create SOPs in `sops/` directory
- Document common mistakes and how to avoid them

### File Format

All memory and SOP files use Markdown format with:
- Clear headings (##, ###)
- Bullet points for lists
- Code blocks for examples
- Templates at the end for future entries

## Integration with CLAUDE.md

The root `CLAUDE.md` file references this directory and mandates:
- Automatic memory updates after completing work
- Using SOPs for standard tasks
- Invoking subagents as documented

This ensures persistent context across Claude Code sessions and standardized workflows.
