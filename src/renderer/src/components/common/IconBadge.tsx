import React from 'react'
import {
  Folder,
  Terminal,
  FileText,
  Calculator,
  Activity,
  Download,
  Code2,
  Globe,
  Pin,
  Move,
  Trash2,
  Cpu,
  Copy,
  Minimize2,
  Sparkles,
  RotateCcw,
  Layers,
  Calendar,
  HelpCircle
} from 'lucide-react'

const ICON_MAP: Record<string, React.ElementType> = {
  Folder,
  Terminal,
  FileText,
  Calculator,
  Activity,
  Download,
  Code2,
  Globe,
  Pin,
  Move,
  Trash2,
  Cpu,
  Copy,
  Minimize2,
  Sparkles,
  RotateCcw,
  Layers,
  Calendar
}

interface IconBadgeProps {
  name: string
  size?: number
  className?: string
  accent?: boolean
}

export const IconBadge: React.FC<IconBadgeProps> = ({
  name,
  size = 18,
  className = '',
  accent = false
}) => {
  const IconComponent = ICON_MAP[name] || HelpCircle

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: accent ? 'var(--accent)' : 'inherit'
      }}
      className={className}
    >
      <IconComponent size={size} />
    </div>
  )
}
