import React, { useState } from 'react'
import { Copy, Trash2, Search, Check, Link, Code, FileText } from 'lucide-react'
import { useIslandStore } from '../../store/useIslandStore'
import { ClipboardItem } from '../../shared'

export const ClipboardWidget: React.FC = () => {
  const { clipboardItems, setClipboardItems, setStatusMessage } = useIslandStore()
  const [filterQuery, setFilterQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = async (item: ClipboardItem): Promise<void> => {
    if (window.isDelulu) {
      await window.isDelulu.copyText(item.text)
    } else {
      navigator.clipboard.writeText(item.text)
    }

    setCopiedId(item.id)
    setStatusMessage('Copied to clipboard')
    setTimeout(() => setCopiedId(null), 1800)
  }

  const handleClear = async (): Promise<void> => {
    if (window.isDelulu) {
      await window.isDelulu.clearClipboard()
    }
    setClipboardItems([])
    setStatusMessage('Clipboard history wiped')
  }

  const filtered = clipboardItems.filter((item) =>
    item.text.toLowerCase().includes(filterQuery.toLowerCase())
  )

  const getTypeIcon = (type: ClipboardItem['type']): React.ReactNode => {
    switch (type) {
      case 'url':
        return <Link size={12} color="var(--accent)" />
      case 'code':
        return <Code size={12} color="#7DD3FC" />
      default:
        return <FileText size={12} color="var(--text-secondary)" />
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Top Search & Clear Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-button)'
          }}
        >
          <Search size={14} color="var(--text-secondary)" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search clipboard snippets..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-text)',
              fontSize: '12px',
              letterSpacing: '-0.005em'
            }}
          />
        </div>

        <button
          className="btn-icon"
          title="Clear Clipboard History"
          onClick={handleClear}
          disabled={clipboardItems.length === 0}
          style={{
            opacity: clipboardItems.length === 0 ? 0.4 : 1,
            padding: '8px'
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Snippets List */}
      <div
        className="no-drag"
        style={{
          maxHeight: '260px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          paddingRight: '2px'
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '36px 0',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px'
            }}
          >
            {clipboardItems.length === 0
              ? 'Clipboard history is empty. Copy any text on your desktop to record.'
              : `No items matching "${filterQuery}"`}
          </div>
        ) : (
          filtered.map((item) => {
            const isJustCopied = copiedId === item.id
            return (
              <div
                key={item.id}
                onClick={() => handleCopy(item)}
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-card)',
                  border: isJustCopied
                    ? '1px solid var(--accent-border)'
                    : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-card)',
                  boxShadow: 'var(--shadow-card)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '4px'
                    }}
                  >
                    {getTypeIcon(item.type)}
                    <span
                      style={{
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        color: 'var(--text-muted)'
                      }}
                    >
                      {item.type}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                      • {item.charCount} chars
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontFamily: item.type === 'code' ? 'var(--font-mono)' : 'var(--font-text)',
                      letterSpacing: item.type === 'code' ? 'normal' : '-0.003em'
                    }}
                  >
                    {item.preview}
                  </p>
                </div>

                <div
                  style={{
                    padding: '6px',
                    borderRadius: '6px',
                    backgroundColor: isJustCopied
                      ? 'var(--accent-glow)'
                      : 'rgba(255, 255, 255, 0.04)',
                    color: isJustCopied ? 'var(--accent)' : 'var(--text-secondary)'
                  }}
                >
                  {isJustCopied ? <Check size={13} /> : <Copy size={13} />}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
