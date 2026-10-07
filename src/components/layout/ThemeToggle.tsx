import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'acervo_theme'

function readDark() {
  if (document.documentElement.classList.contains('dark')) return true
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark'
  } catch {
    return false
  }
}

export function ThemeToggle() {
  const [dark, setDark] = useState(readDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
    } catch {
      /* armazenamento bloqueado: o tema vale só nesta visita */
    }
  }, [dark])

  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={dark ? 'Tema claro' : 'Tema escuro'}
      onClick={() => setDark((value) => !value)}
      className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded transition-colors"
    >
      {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}
