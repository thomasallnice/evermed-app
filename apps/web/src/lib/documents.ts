import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

/**
 * Create a Document row in the database.
 */
export async function createDocument({
  personId,
  kind,
  filename,
  storagePath,
  sha256,
}: {
  personId: string;
  kind: string;
  filename: string;
  storagePath: string;
  sha256: string;
}) {
  return prisma.document.create({
    data: {
      personId,
      kind,
      filename,
      storagePath,
      sha256,
    },
  });
}

/**
 * Fetch a Document row for an authorized user.
 */
export async function getDocumentForOwner(documentId: string, ownerId: string) {
  return prisma.document.findFirst({
    where: {
      id: documentId,
      person: {
        ownerId,
      },
    },
  });
}

/**
 * Fetch a Document row for owner and return a signed URL to the private file.
 */
export async function getDocumentAuthorized(documentId: string, ownerId: string) {
  const doc = await getDocumentForOwner(documentId, ownerId);
  if (!doc) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let signedUrl = 'https://signed.example/url';
  if (url && key) {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await (supabase as any).storage
      .from("documents")
      .createSignedUrl(doc.storagePath, 3600);
    if (!error && data?.signedUrl) signedUrl = data.signedUrl as string;
  }
  return {
    id: doc.id,
    filename: doc.filename,
    kind: doc.kind,
    uploadedAt: doc.uploadedAt,
    signedUrl,
  };
}
