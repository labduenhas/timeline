import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { DEFAULT_PAGES, DEFAULT_SETTINGS, mergeSettings } from '@/lib/siteDefaults'
import type { SitePage, SiteSettings } from '@/types'

interface SiteContextValue {
  settings: SiteSettings
  pages: SitePage[]
  loading: boolean
  refreshSite: () => Promise<void>
}

const SiteContext = createContext<SiteContextValue>({
  settings: DEFAULT_SETTINGS,
  pages: DEFAULT_PAGES,
  loading: true,
  refreshSite: async () => {},
})

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [pages, setPages] = useState<SitePage[]>(DEFAULT_PAGES)
  const [loading, setLoading] = useState(true)

  const refreshSite = useCallback(async () => {
    try {
      const [settingsRes, pagesRes] = await Promise.all([
        api.getSettings().catch(() => null),
        api.getPages(false).catch(() => null),
      ])
      if (settingsRes?.settings) setSettings(mergeSettings(settingsRes.settings))
      if (pagesRes?.items) setPages(pagesRes.items)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshSite()
  }, [refreshSite])

  const value = useMemo(
    () => ({ settings, pages, loading, refreshSite }),
    [settings, pages, loading, refreshSite]
  )

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite() {
  return useContext(SiteContext)
}
