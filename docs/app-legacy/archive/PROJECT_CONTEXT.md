# EverMed Project Context

## Quick Brief for New AI Assistant

You're helping with EverMed, a Next.js app for family caregivers. Key points:

1. **Philosophy**: Simple peace-of-mind, NOT complex medical management
2. **Stack**: Next.js 15, Supabase, Tailwind CSS v4, TypeScript
3. **Database**: Just 1 table (family_members) - we removed 50+ unnecessary tables
4. **Deployment**: Vercel → Frankfurt (GDPR), 3 environments (dev/staging/prod)
5. **Structure**: Monorepo with frontend/ directory
6. **Branches**: development → staging → main

## Copy-Paste Context
Project: EverMed - Family caregiver peace-of-mind app
Stack: Next.js 15.4.4, Supabase, Tailwind v4, TypeScript
Deploy: Vercel (Frankfurt region)
DB: Single family_members table
Envs: dev.evermed.ai, staging.evermed.ai, app.evermed.ai
Key: Simple MVP, not complex medical system

## Critical Configurations

- vercel.json MUST be at repository root, not in frontend/
- Root Directory setting in Vercel: "frontend"
- PostCSS uses Tailwind v4 syntax
- Each environment has separate Supabase project
- RLS policies must avoid recursion

## What NOT to Do

- Don't add complex medical features
- Don't create new database tables
- Don't add medication tracking
- Don't complicate the simple MVP

## Project Goals

1. Help overwhelmed caregivers find peace
2. Simple status tracking (all well / needs attention)
3. Quick photo captures for AI analysis (future)
4. Mobile-first, accessible design
