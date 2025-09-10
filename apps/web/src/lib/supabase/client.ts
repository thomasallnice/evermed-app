import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined

let client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabase() {
  if (client) return client
  if (!supabaseUrl || !supabaseAnonKey) {
    // Defer creation until runtime when envs are available
    throw new Error('Supabase env not set')
  }
  client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return client
}
