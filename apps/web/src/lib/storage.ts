import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

function getServiceClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error('Supabase env missing for server-side storage operations');
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

export async function getSignedUrlForDocument(storagePath: string, expiresInSeconds = 3600) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

