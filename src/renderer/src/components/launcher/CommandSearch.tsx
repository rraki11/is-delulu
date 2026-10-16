import React, { useState, useEffect, useRef } from 'react'
import { Search, CornerDownLeft, Sparkles } from 'lucide-react'
import { DEFAULT_COMMANDS, DEFAULT_SHORTCUTS } from '../../shared'
import { IconBadge } from '../common/IconBadge'
import { useIslandStore } from '../../store/useIslandStore'

interface CommandSearchProps {
  onExecuteAction: (id: string, target?: string) => void
}

export const CommandSearch: React.FC<CommandSearchProps> = ({ onExecuteAction }) => {
  const { searchQuery, setSearchQuery } = useIslandStore()
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Combine commands and shortcuts for search
  const allItems = [
    ...DEFAULT_COMMANDS.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      icon: c.icon,
      type: 'command' as const,
      isReal: true,
      keywords: c.keywords,
      shortcut: c.shortcut,
      target: undefined
    })),
    ...DEFAULT_SHORTCUTS.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      icon: s.icon,
      type: 'shortcut' as const,
      isReal: !s.isInstalledMock,
      keywords: [s.title.toLowerCase(), s.category, s.description.toLowerCase()],
      shortcut: undefined,
      target: s.target
    }))
  ]

  const filteredItems = allItems.filter((item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q))
    )
  })

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev - 1 < 0 ? Math.max(0, filteredItems.length - 1) : prev - 1
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = filteredItems[selectedIndex]
      if (selected) {
        onExecuteAction(selected.id, selected.target)
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Search Input Bar */}
      <div
        className="no-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          backgroundColor: 'var(--bg-input)',
          border: '1px solid var(--accent-border)',
          borderRadius: 'var(--radius-button)',
          boxShadow: '0 0 16px -4px var(--accent-glow)'
        }}
      >
        <Search size={16} color="var(--accent)" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setSelectedIndex(0)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search commands, apps, or type an action..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 400,
            lineHeight: '18px',
            fontFamily: 'var(--font-text)',
            letterSpacing: '0'
          }}
        />
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontFamily: 'var(--font-text)',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              fontWeight: 500,
              lineHeight: '12px',
              fontFamily: 'var(--font-text)',
              color: 'var(--text-muted)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              padding: '2px 6px',
              borderRadius: '4px',
              letterSpacing: '0.02em'
            }}
          >
            <span>Navigate</span>
            <span>↑↓</span>
          </div>
        )}
      </div>

      {/* Results List */}
      <div
        className="no-drag"
        style={{
          maxHeight: '190px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          paddingRight: '2px'
        }}
      >
        {filteredItems.length === 0 ? (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 400,
              lineHeight: '16px',
              fontFamily: 'var(--font-text)'
            }}
          >
            No commands or apps matching &quot;{searchQuery}&quot;
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const isSelected = index === selectedIndex
            return (
              <div
                key={item.id}
                onClick={() => onExecuteAction(item.id, item.target)}
                onMouseEnter={() => setSelectedIndex(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                  border: isSelected
                    ? '1px solid var(--accent-border)'
                    : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: isSelected
                        ? 'var(--accent-glow)'
                        : 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? 'var(--accent)' : 'var(--text-secondary)'
                    }}
                  >
                    <IconBadge name={item.icon} size={15} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          lineHeight: '16px',
                          letterSpacing: '0',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-text)'
                        }}
                      >
                        {item.title}
                      </span>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 500,
                          lineHeight: '12px',
                          letterSpacing: '0.02em',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: item.isReal
                            ? 'var(--accent-subtle)'
                            : 'rgba(255, 255, 255, 0.06)',
                          color: item.isReal ? 'var(--accent)' : 'var(--text-muted)',
                          fontFamily: 'var(--font-text)'
                        }}
                      >
                        {item.isReal ? 'Native' : 'Mock'}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '11px',
                        fontWeight: 400,
                        lineHeight: '15px',
                        letterSpacing: '0',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-text)'
                      }}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {item.shortcut && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 500,
                        lineHeight: '12px',
                        letterSpacing: '0.02em',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-text)'
                      }}
                    >
                      {item.shortcut}
                    </span>
                  )}
                  {isSelected && <CornerDownLeft size={13} color="var(--accent)" />}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
