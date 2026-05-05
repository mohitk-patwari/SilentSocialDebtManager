import { useCallback, useEffect, useState } from 'react'
import type { SOULProfile } from '@ssdm/shared'
import { ApiError, fetchContacts, fetchContact } from '../api/client'
import { parseSOULProfile } from '../lib/parseDates'

export function useContacts() {
  const [contacts, setContacts] = useState<SOULProfile[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchContacts(100, 0)
      setContacts(data.contacts.map((c) => parseSOULProfile(c)))
      setTotal(data.total)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { contacts, total, loading, error, refresh }
}

export function useContactDetail(id: string | undefined) {
  const [profile, setProfile] = useState<SOULProfile | null>(null)
  const [loading, setLoading] = useState(!!id)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setProfile(null)
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        setLoading(true)
        setError(null)
        const raw = await fetchContact(id)
        if (!cancelled) {
          setProfile(parseSOULProfile(raw))
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof ApiError ? e.message : String(e)
          setError(msg)
          setProfile(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  return { profile, loading, error }
}
