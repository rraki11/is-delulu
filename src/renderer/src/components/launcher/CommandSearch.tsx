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
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Search Input Bar */}
      <div
        className="no-drag"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 14px',
          backgroundColor: 'var(--bg-input)',
          border: `1px solid ${isInputFocused ? 'var(--accent-border)' : 'var(--border-input)'}`,
          borderRadius: 'var(--radius-button)',
          boxShadow: isInputFocused
            ? '0 0 0 1px var(--accent-border), 0 0 12px -2px var(--accent-glow)'
            : 'var(--shadow-input)',
          transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)'
        }}
      >
        <Search
          size={16}
          color={isInputFocused || searchQuery ? 'var(--accent)' : 'var(--search-icon-color)'}
          style={{ transition: 'color var(--transition-fast)' }}
        />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
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
              color: 'var(--accent)',
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
              backgroundColor: 'var(--icon-container-bg)',
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
          maxHeight: '170px',
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
                  backgroundColor: isSelected ? 'var(--search-item-selected-bg)' : 'transparent',
                  border: isSelected
                    ? '1px solid var(--search-item-selected-border)'
                    : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast), border-color var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: isSelected
                        ? 'var(--search-item-icon-bg)'
                        : 'var(--icon-container-bg)',
                      boxShadow: isSelected ? 'none' : 'var(--icon-container-shadow)',
                      border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? 'var(--search-item-icon-color)' : 'var(--text-secondary)',
                      transition: 'all var(--transition-fast)'
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
                            ? 'var(--badge-bg)'
                            : 'var(--badge-mock-bg)',
                          color: item.isReal ? 'var(--badge-text)' : 'var(--badge-mock-text)',
                          border: item.isReal ? '1px solid var(--accent-border)' : '1px solid transparent',
                          fontFamily: 'var(--font-text)',
                          transition: 'all var(--transition-fast)'
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
