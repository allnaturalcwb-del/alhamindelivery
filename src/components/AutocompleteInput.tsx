'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  onBlur?: (value: string) => void
  placeholder?: string
  className?: string
}

export default function AutocompleteInput({ value, onChange, onBlur, placeholder, className }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showList, setShowList] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fecha lista ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowList(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function buscarSugestoes(texto: string) {
    if (texto.length < 3) { setSuggestions([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/autocomplete?input=${encodeURIComponent(texto)}`)
      const data = await res.json()
      setSuggestions(data || [])
      setShowList(true)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const texto = e.target.value
    onChange(texto)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscarSugestoes(texto), 400)
  }

  function handleSelect(sugestao: string) {
    onChange(sugestao)
    setSuggestions([])
    setShowList(false)
    if (onBlur) onBlur(sugestao)
  }

  function handleBlur() {
    // Pequeno delay para permitir o clique na sugestão
    setTimeout(() => {
      setShowList(false)
      if (onBlur) onBlur(value)
    }, 200)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={() => suggestions.length > 0 && setShowList(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-[#F7941D] border-t-transparent rounded-full" />
        </div>
      )}
      {showList && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}
              onMouseDown={() => handleSelect(s)}
              className="px-4 py-3 text-sm text-gray-800 hover:bg-orange-50 hover:text-[#F7941D] cursor-pointer border-b border-gray-50 last:border-0 flex items-start gap-2">
              <span className="mt-0.5 shrink-0">📍</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
