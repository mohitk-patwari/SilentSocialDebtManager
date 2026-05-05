import { useCallback, useEffect, useState } from 'react'
import type { ActionItem } from '@ssdm/shared'
import { ApiError, fetchQueue } from '../api/client'
import { parseActionItem } from '../lib/parseDates'

export function useQueue(topN = 50) {
  const [queue, setQueue] = useState<ActionItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchQueue(topN)
      const parsed = data.queue.map((r) => parseActionItem(r))
      parsed.sort((a, b) => b.score - a.score)
      setQueue(parsed)
      setTotal(data.total)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [topN])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { queue, total, loading, error, refresh }
}
