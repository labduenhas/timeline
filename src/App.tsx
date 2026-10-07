import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { HomePage } from '@/pages/Home'
import { TimelinePage } from '@/pages/TimelinePage'
import { DocumentPage } from '@/pages/DocumentPage'
import { AdminPage } from '@/pages/AdminPage'
import { InstitutionalPage } from '@/pages/InstitutionalPage'
import { SiteProvider } from '@/context/SiteContext'

export function App() {
  return (
    <BrowserRouter>
      <SiteProvider>
        <div className="min-h-screen flex flex-col bg-surface text-on-surface selection:bg-secondary-fixed selection:text-on-secondary-fixed">
          <Header />
          <main className="flex-1 pt-[7.25rem] lg:pt-20">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/timeline" element={<TimelinePage />} />
              <Route path="/doc/:slug" element={<DocumentPage />} />
              <Route path="/p/:slug" element={<InstitutionalPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </SiteProvider>
    </BrowserRouter>
  )
}

export default App
