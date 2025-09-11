## PR #4 — Chat + RAG with citations and refusals

### Retrieval query (pgvector)
```sql
SELECT dc."documentId", dc."sourceAnchor", dc."text"
FROM "DocChunk" dc
JOIN "Document" d ON d.id = dc."documentId"
WHERE d."personId" = $1
ORDER BY CASE WHEN dc.embedding IS NOT NULL THEN dc.embedding <-> '[…]'::vector ELSE 1e9 END
LIMIT $2;
```

### Citation format
```json
{ "documentId": "uuid", "sourceAnchor": "p1.l2" }
```

### Refusal and escalation copy
- Refusal: "I can’t help with that. I don’t provide diagnosis, dosing, emergency triage, or image interpretation."
- Escalation: "If you have chest pain, trouble breathing, severe bleeding, or feel unsafe, seek emergency care immediately."

