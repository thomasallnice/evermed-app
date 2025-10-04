# Claude Code Subagents for EverMed - MANDATORY USAGE

**CRITICAL**: This directory contains specialized subagents that **MUST** be invoked using the Task tool for domain-specific work. Subagent usage is **REQUIRED**, not optional.

## Available Subagents

### 1. **medical-compliance-guardian**
**MUST USE WHEN:** After any changes to AI outputs, medical data handling, or user-facing medical content

**Invoke with Task tool:**
```typescript
Task({
  subagent_type: "medical-compliance-guardian",
  description: "Review medical safety compliance",
  prompt: "Review [specific changes] for non-SaMD compliance, citation requirements, and proper medical disclaimers."
})
```

**Responsibilities:**
- Enforces non-SaMD guardrails (no diagnosis/dosing/triage)
- Validates all AI outputs include source citations
- Reviews refusal templates and medical disclaimers
- Ensures PHI is never logged to analytics

---

### 2. **database-architect**
**MUST USE WHEN:** Database schema changes, Prisma migrations, or relation modifications

**Invoke with Task tool:**
```typescript
Task({
  subagent_type: "database-architect",
  description: "Design schema migration",
  prompt: "Create migration for [specific change]. Ensure relations, indexes, and RLS compatibility."
})
```

**Responsibilities:**
- Prisma schema design and migration creation
- pgvector integration for embeddings
- Relation integrity (both sides defined)
- Cascading deletes and index optimization

---

### 3. **rag-pipeline-manager**
**MUST USE WHEN:** RAG pipeline changes, embedding logic, or semantic search modifications

**Invoke with Task tool:**
```typescript
Task({
  subagent_type: "rag-pipeline-manager",
  description: "Implement RAG feature",
  prompt: "Implement [feature] in RAG pipeline. Ensure citation tracking and pgvector integration."
})
```

**Responsibilities:**
- OCR → chunking → embeddings → search flow
- OpenAI embeddings and pgvector queries
- Citation and provenance tracking
- Embedding failure handling

---

### 4. **supabase-rls-security**
**MUST USE WHEN:** RLS policy changes, storage security, or multi-tenant isolation

**Invoke with Task tool:**
```typescript
Task({
  subagent_type: "supabase-rls-security",
  description: "Implement RLS policies",
  prompt: "Design RLS policies for [tables]. Ensure transitive ownership and storage security."
})
```

**Responsibilities:**
- Row Level Security policy design
- Multi-tenant data isolation (Person.ownerId → auth.uid())
- Storage bucket security with signed URLs
- RLS testing with different user sessions

---

### 5. **api-contract-validator**
**MUST USE WHEN:** Adding/modifying API routes, before merging API changes, during code reviews

**Invoke with Task tool:**
```typescript
Task({
  subagent_type: "api-contract-validator",
  description: "Validate API contract",
  prompt: "Validate [endpoint] against CODEX_REFIT_PLAN.md. Check request/response shapes, auth, and flag deviations."
})
```

**Responsibilities:**
- Validates routes against CODEX_REFIT_PLAN.md spec
- Checks request/response shapes
- Validates authentication requirements
- Flags undocumented endpoints and contract violations

---

### 6. **pr-validation-orchestrator**
**MUST USE WHEN:** Before creating any pull request

**Invoke with Task tool:**
```typescript
Task({
  subagent_type: "pr-validation-orchestrator",
  description: "Prepare PR validation",
  prompt: "Run CODE_REVIEW.md checklist for [feature]. Generate PR template and validate all requirements."
})
```

**Responsibilities:**
- Validates CODE_REVIEW.md checklist
- Runs full CI suite validation
- Checks guard files unchanged
- Generates comprehensive PR templates

---

### 7. **vitest-test-writer**
**MUST USE WHEN:** Adding features or fixing bugs that need test coverage

**Invoke with Task tool:**
```typescript
Task({
  subagent_type: "vitest-test-writer",
  description: "Write comprehensive tests",
  prompt: "Write tests for [feature]. Include medical safety, citation requirements, and performance validation."
})
```

**Responsibilities:**
- Writes Vitest unit and integration tests
- Tests medical safety and citation requirements
- Validates performance (p95 < 10s)
- Tests error cases and edge conditions

---

### 8. **nextjs-ui-builder**
**MUST USE WHEN:** UI components, styling, UX flows, or frontend development

**Invoke with Task tool:**
```typescript
Task({
  subagent_type: "nextjs-ui-builder",
  description: "Build UI component",
  prompt: "Create [component] with Next.js 14 App Router. Ensure responsive design, accessibility, and medical disclaimers."
})
```

**Responsibilities:**
- Next.js 14 App Router and React 18 components
- Tailwind CSS styling and responsive design
- UX flows, onboarding, starter cards
- Accessibility (WCAG 2.1 AA) and medical data visualization

---

## Invocation Requirements

### When You MUST Invoke Subagents

| Task Type | Required Subagent |
|-----------|-------------------|
| Schema changes | `database-architect` |
| API route changes | `api-contract-validator` |
| AI/medical features | `medical-compliance-guardian` |
| RAG/embeddings | `rag-pipeline-manager` |
| RLS policies | `supabase-rls-security` |
| UI components | `nextjs-ui-builder` |
| Test writing | `vitest-test-writer` |
| Creating PRs | `pr-validation-orchestrator` |

### Task Tool Syntax

All subagents are invoked using the Task tool:

```typescript
Task({
  subagent_type: "agent-name",        // Required: exact agent name
  description: "Brief description",    // Required: short task summary
  prompt: "Detailed instructions"      // Required: specific task details
})
```

### Failure to Invoke

**Failure to invoke the appropriate subagent when required is a critical error.** Each agent has:
- Specialized domain expertise
- Validation logic that cannot be replicated
- Project-specific knowledge and patterns
- Mandatory compliance checks (especially medical safety)

## Reference

- Main documentation: `CLAUDE.md`
- Ground truth: `docs/CODEX_REFIT_PLAN.md`
- Agent conventions: `AGENTS.md`
- Individual agent configs: `.claude/agents/*.md`
