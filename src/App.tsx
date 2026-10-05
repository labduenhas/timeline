import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { HomePage } from '@/pages/Home'
import { TimelinePage } from '@/pages/TimelinePage'
import { DocumentPage } from '@/pages/DocumentPage'
import { AdminPage } from '@/pages/AdminPage'

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100 selection:bg-indigo-500/30 selection:text-indigo-200">
        <Header />
        <main className="flex-1 pt-16">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/doc/:slug" element={<DocumentPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
