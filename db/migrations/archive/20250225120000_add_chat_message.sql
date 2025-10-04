CREATE TABLE IF NOT EXISTS "ChatMessage" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  "documentId" uuid NULL REFERENCES "Document"(id) ON DELETE SET NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");
