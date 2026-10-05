import React from 'react'

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-gray-950/80 backdrop-blur-md py-6 text-center text-xs text-gray-500">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>© {new Date().getFullYear()} Acervo Timeline — Preservação da Memória Histórica e Documental.</p>
        <p className="flex items-center gap-2">
          <span>Desenvolvido com</span>
          <span className="text-indigo-400 font-medium">React + Vite + Hono + Cloudflare D1/R2</span>
        </p>
      </div>
    </footer>
  )
}
