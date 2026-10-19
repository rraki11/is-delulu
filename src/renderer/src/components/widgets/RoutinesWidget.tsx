import React from 'react'
import { Sparkles, Terminal, RotateCcw, CheckCircle2, Circle } from 'lucide-react'
import { useIslandStore } from '../../store/useIslandStore'
import { DesktopRoutine } from '../../shared'

export const RoutinesWidget: React.FC = () => {
  const { routines, setRoutines, setStatusMessage } = useIslandStore()

  const handleToggle = async (routine: DesktopRoutine): Promise<void> => {
    if (window.isDelulu) {
      const updated = await window.isDelulu.toggleRoutine(routine.id)
      setRoutines(updated)
    } else {
      setRoutines(
        routines.map((r) => (r.id === routine.id ? { ...r, isActive: !r.isActive } : r))
      )
    }

    const nextState = !routine.isActive
    setStatusMessage(`${routine.name} ${nextState ? 'activated' : 'deactivated'}`)
  }

  const getRoutineIcon = (id: string): React.ReactNode => {
    switch (id) {
      case 'focus-mode':
        return <Sparkles size={16} color="var(--accent)" />
      case 'dev-flow':
        return <Terminal size={16} color="var(--accent)" />
      default:
        return <RotateCcw size={16} color="var(--accent)" />
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          className="font-display"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Automated Desktop Routines
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          Local execution
        </span>
      </div>

      <div
        className="no-drag"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {routines.map((routine) => {
          return (
            <div
              key={routine.id}
              onClick={() => handleToggle(routine)}
              className="glass-surface"
              style={{
                padding: '12px 14px',
                cursor: 'pointer',
                borderColor: routine.isActive
                  ? 'var(--accent-border)'
                  : 'var(--border-subtle)',
                backgroundColor: routine.isActive
                  ? 'var(--accent-subtle)'
                  : 'var(--bg-card)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: routine.isActive
                        ? 'var(--accent-glow)'
                        : 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {getRoutineIcon(routine.id)}
                  </div>

                  <div>
                    <span
                      className="font-text"
                      style={{
                        fontFamily: 'var(--font-text)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.005em'
                      }}
                    >
                      {routine.name}
                    </span>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                      {routine.tags.map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: '9px',
                            color: 'var(--text-muted)',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            padding: '1px 5px',
                            borderRadius: '3px'
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Toggle Pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    backgroundColor: routine.isActive
                      ? 'var(--accent-glow)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: routine.isActive
                      ? '1px solid var(--accent-border)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    color: routine.isActive ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: '10px',
                    fontWeight: 600
                  }}
                >
                  {routine.isActive ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                  <span>{routine.isActive ? 'Active' : 'Off'}</span>
                </div>
              </div>

              <p
                className="font-text"
                style={{
                  fontFamily: 'var(--font-text)',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  marginBottom: '8px',
                  lineHeight: 1.4,
                  letterSpacing: '-0.003em'
                }}
              >
                {routine.description}
              </p>

              {/* Steps list */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingTop: '6px'
                }}
              >
                {routine.steps.map((step, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '10px',
                      color: routine.isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <span style={{ color: 'var(--accent)', fontSize: '8px' }}>•</span>
                    {step}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
