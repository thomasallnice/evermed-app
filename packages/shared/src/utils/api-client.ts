/**
 * API Client with Vercel Deployment Protection bypass
 *
 * This wrapper automatically adds the x-vercel-protection-bypass header
 * for staging/preview environments where Deployment Protection is enabled.
 */

/**
 * Enhanced fetch wrapper that adds Vercel Deployment Protection bypass header
 *
 * @param input - URL or Request object
 * @param init - Fetch options
 * @returns Promise<Response>
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers || {})

  // Add Vercel Deployment Protection bypass header for staging/preview
  // This header allows API calls to work in environments with Deployment Protection enabled
  if (process.env.NEXT_PUBLIC_VERCEL_BYPASS_TOKEN) {
    headers.set('x-vercel-protection-bypass', process.env.NEXT_PUBLIC_VERCEL_BYPASS_TOKEN)
  }

  return fetch(input, {
    ...init,
    headers,
  })
}

/**
 * JSON API helper - automatically parses JSON responses
 *
 * @param input - URL or Request object
 * @param init - Fetch options
 * @returns Parsed JSON response
 * @throws Error if response is not ok or JSON parsing fails
 */
export async function apiJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await apiFetch(input, init)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  return response.json()
}
