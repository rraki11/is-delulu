import React, { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Search, Settings, FileText, Code, Link as LinkIcon, Image, Pin, Trash2, Check } from 'lucide-react'
import { useIslandStore } from '../../store/useIslandStore'
import { ClipboardItem, HITODAMA_EASING } from '../../shared'

const FILTER_CHIPS = ['All', 'Text', 'Images', 'Links'] as const
type FilterChip = (typeof FILTER_CHIPS)[number]

export const ClipboardWidget: React.FC = () => {
  const { clipboardItems, setClipboardItems, setStatusMessage } = useIslandStore()
  const [search, setSearch] = useState('')
  const [activeChip, setActiveChip] = useState<FilterChip>('All')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())

  // Default sample history items if clipboard is empty
  const defaultItems: ClipboardItem[] = useMemo(() => [
    {
      id: 'clip-sample-1',
      text: "Hey Arsh, what's up? How about we go get some coffee at 10 in the morning, and then hang out at the park for a bit?",
      preview: "Hey Arsh, what's up? How about we go get some coffee at 10 in the morning...",
      timestamp: Date.now() - 3600000,
      type: 'text',
      charCount: 108
    },
    {
      id: 'clip-sample-2',
      text: "const easeCurve = [0.33, 1, 0.68, 1];\nexport default easeCurve;",
      preview: "const easeCurve = [0.33, 1, 0.68, 1];",
      timestamp: Date.now() - 7200000,
      type: 'code',
      charCount: 62
    },
    {
      id: 'clip-sample-3',
      text: "https://hitodama.in/",
      preview: "https://hitodama.in/",
      timestamp: Date.now() - 14400000,
      type: 'url',
      charCount: 20
    }
  ], [])

  const allItems = clipboardItems.length > 0 ? clipboardItems : defaultItems

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Search filter
      if (search.trim() && !item.text.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      // Chip filter
      if (activeChip === 'Text') return item.type === 'text'
      if (activeChip === 'Links') return item.type === 'url'
      if (activeChip === 'Images') return false // currently text clipboard
      return true
    })
  }, [allItems, search, activeChip])

  const selectedItem = filteredItems[selectedIndex] ?? filteredItems[0]

  const handleCopy = async (item: ClipboardItem): Promise<void> => {
    if (window.isDelulu?.copyText) {
      await window.isDelulu.copyText(item.text)
    } else {
      navigator.clipboard.writeText(item.text)
    }
    setCopiedId(item.id)
    setStatusMessage('Copied to clipboard')
    setTimeout(() => setCopiedId(null), 1500)
  }

  const togglePin = (id: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = (id: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    const next = clipboardItems.filter((i) => i.id !== id)
    setClipboardItems(next)
    if (selectedIndex >= next.length) {
      setSelectedIndex(Math.max(0, next.length - 1))
    }
  }

  // Calculate text metrics for inspector
  const textBody = selectedItem?.text ?? ''
  const charCount = textBody.length
  const wordCount = textBody.trim() ? textBody.trim().split(/\s+/).length : 0
  const lineCount = textBody.split('\n').length

  const formatTimestamp = (ts: number): string => {
    const d = new Date(ts)
    return `Today, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  }

  const getTypeIcon = (type: ClipboardItem['type']): React.ReactNode => {
    switch (type) {
      case 'url':
        return <LinkIcon size={14} color="#60A5FA" />
      case 'code':
        return <Code size={14} color="#7DD3FC" />
      default:
        return <FileText size={14} color="#8E919A" />
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '100%',
        maxWidth: '820px',
        margin: '0 auto',
        height: '370px',
        boxSizing: 'border-box',
        userSelect: 'none'
      }}
    >
      {/* ── Search Bar & Filter Chips Header ────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          height: '38px',
          padding: '0 12px',
          borderRadius: '12px',
          backgroundColor: '#161719',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <Search size={16} color="#8E919A" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder={`Search ${allItems.length} items…`}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#F4F5F7',
              fontSize: '12px',
              flex: 1
            }}
          />
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setActiveChip(chip)
                setSelectedIndex(0)
              }}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                border: 'none',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: activeChip === chip
                  ? 'var(--hitodama-accent, #D7B56D)'
                  : 'transparent',
                color: activeChip === chip ? '#141310' : '#8E919A',
                transition: 'background-color 140ms ease, color 140ms ease'
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        <Settings size={15} color="#6E727A" style={{ cursor: 'pointer' }} />
      </div>

      {/* ── Split Layout: Item List + Inspector ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '12px', flex: 1, minHeight: 0 }}>
        {/* Item List */}
        <div
          style={{
            borderRadius: '14px',
            backgroundColor: '#161719',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '8px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {filteredItems.map((item, idx) => {
            const isSelected = idx === selectedIndex
            const isPinned = pinnedIds.has(item.id)

            return (
              <motion.div
                key={item.id}
                onClick={() => setSelectedIndex(idx)}
                onDoubleClick={() => handleCopy(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: isSelected
                    ? 'rgba(215, 181, 109, 0.14)'
                    : 'transparent',
                  border: isSelected
                    ? '1px solid rgba(215, 181, 109, 0.32)'
                    : '1px solid transparent',
                  transition: 'background-color 140ms ease, border-color 140ms ease'
                }}
                whileHover={{ backgroundColor: isSelected ? 'rgba(215, 181, 109, 0.18)' : 'rgba(255, 255, 255, 0.04)' }}
                transition={{ duration: 0.14, ease: HITODAMA_EASING }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  {getTypeIcon(item.type)}
                  <span
                    style={{
                      fontSize: '12px',
                      color: isSelected ? '#FFFFFF' : '#D0D2D8',
                      fontWeight: isSelected ? 600 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}
                  >
                    {item.preview}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
                  {isPinned && <Pin size={11} color="var(--hitodama-accent, #D7B56D)" fill="var(--hitodama-accent, #D7B56D)" />}
                  <span style={{ fontSize: '10px', color: '#6E727A', whiteSpace: 'nowrap' }}>
                    {formatTimestamp(item.timestamp).split(', ')[1]}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Rich Inspector Preview */}
        <div
          style={{
            borderRadius: '14px',
            backgroundColor: '#161719',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box'
          }}
        >
          {/* Full Text Body */}
          <div
            style={{
              maxHeight: '140px',
              overflowY: 'auto',
              fontSize: '12px',
              lineHeight: 1.5,
              color: '#F4F5F7',
              wordBreak: 'break-word',
              userSelect: 'text'
            }}
          >
            {textBody || 'No item selected'}
          </div>

          {/* Divider */}
          <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '8px 0' }} />

          {/* Metadata Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6E727A', fontWeight: 500 }}>Type</span>
              <span style={{ color: '#D0D2D8', fontWeight: 600, textTransform: 'capitalize' }}>
                {selectedItem?.type ?? 'Text'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6E727A', fontWeight: 500 }}>Size</span>
              <span style={{ color: '#D0D2D8' }}>
                {charCount} characters · {wordCount} words · {lineCount} line{lineCount > 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6E727A', fontWeight: 500 }}>Copied</span>
              <span style={{ color: '#D0D2D8' }}>
                {selectedItem ? formatTimestamp(selectedItem.timestamp) : '—'}
              </span>
            </div>
          </div>

          {/* Quick Copy Action */}
          {selectedItem && (
            <button
              onClick={() => handleCopy(selectedItem)}
              style={{
                marginTop: '10px',
                width: '100%',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: 'var(--hitodama-accent, #D7B56D)',
                border: 'none',
                color: '#141310',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {copiedId === selectedItem.id ? <Check size={13} /> : null}
              <span>{copiedId === selectedItem.id ? 'Copied' : 'Copy to Clipboard'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Keyboard Shortcuts Legend Bar ────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#8E919A',
          padding: '2px 4px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span><kbd style={{ backgroundColor: '#26282E', padding: '1px 5px', borderRadius: '3px', marginRight: '4px' }}>↵</kbd> Paste</span>
          <span><kbd style={{ backgroundColor: '#26282E', padding: '1px 5px', borderRadius: '3px', marginRight: '4px' }}>Ctrl C</kbd> Copy</span>
          <span><kbd style={{ backgroundColor: '#26282E', padding: '1px 5px', borderRadius: '3px', marginRight: '4px' }}>Ctrl P</kbd> Pin</span>
          <span><kbd style={{ backgroundColor: '#26282E', padding: '1px 5px', borderRadius: '3px', marginRight: '4px' }}>Del</kbd> Remove</span>
        </div>
        <span style={{ color: '#6E727A' }}>
          ↑↓ Move  ·  Tab Filter
        </span>
      </div>
    </div>
  )
}

export default ClipboardWidget
