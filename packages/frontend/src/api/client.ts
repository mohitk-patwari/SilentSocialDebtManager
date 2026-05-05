import type { QueueResponse } from '@ssdm/shared'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

export async function fetchQueue(topN = 50): Promise<QueueResponse> {
  const res = await fetch(`${API_BASE}/api/queue?top_n=${topN}`)
  const body = (await parseJson(res)) as {
    success?: boolean
    data?: QueueResponse
    error?: string
  }
  if (!res.ok || body.success === false) {
    throw new ApiError(body.error ?? res.statusText, res.status)
  }
  return body.data as QueueResponse
}

export async function fetchContacts(
  limit = 100,
  offset = 0,
): Promise<{ contacts: unknown[]; total: number }> {
  const res = await fetch(
    `${API_BASE}/api/contacts?limit=${limit}&offset=${offset}`,
  )
  const body = (await parseJson(res)) as {
    success?: boolean
    data?: { contacts: unknown[]; total: number }
    error?: string
  }
  if (!res.ok || body.success === false) {
    throw new ApiError(body.error ?? res.statusText, res.status)
  }
  return body.data as { contacts: unknown[]; total: number }
}

export async function fetchContact(id: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/contacts/${encodeURIComponent(id)}`)
  const body = (await parseJson(res)) as {
    success?: boolean
    data?: unknown
    error?: string
  }
  if (!res.ok || body.success === false) {
    throw new ApiError(body.error ?? res.statusText, res.status)
  }
  return body.data as unknown
}

export async function approveDraft(
  actionId: string,
  edits?: string,
): Promise<{ draft_id: string }> {
  const res = await fetch(
    `${API_BASE}/api/action/${encodeURIComponent(actionId)}/approve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edits !== undefined ? { edits } : {}),
    },
  )
  const body = (await parseJson(res)) as {
    success?: boolean
    draft_id?: string
    error?: string
  }
  if (!res.ok || body.success === false) {
    throw new ApiError(body.error ?? res.statusText, res.status)
  }
  return { draft_id: body.draft_id ?? '' }
}

export async function dismissAction(
  actionId: string,
  reason?: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/action/${encodeURIComponent(actionId)}/dismiss`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reason !== undefined ? { reason } : {}),
    },
  )
  const body = (await parseJson(res)) as { success?: boolean; error?: string }
  if (!res.ok || body.success === false) {
    throw new ApiError(body.error ?? res.statusText, res.status)
  }
}
