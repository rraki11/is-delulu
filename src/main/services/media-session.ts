import { MediaSessionItem } from '../../shared/types'

export class MediaSessionService {
  private sessions: Map<string, MediaSessionItem> = new Map()
  private activeSessionId: string = ''

  public updateSessions(rawSessions: MediaSessionItem[], activeId?: string): void {
    this.sessions.clear()
    for (const session of rawSessions) {
      if (session.sessionId) {
        this.sessions.set(session.sessionId, session)
      }
    }
    this.activeSessionId = activeId || (rawSessions[0]?.sessionId ?? '')
  }

  public getSessions(): MediaSessionItem[] {
    return Array.from(this.sessions.values())
  }

  public getSession(sessionId: string): MediaSessionItem | undefined {
    return this.sessions.get(sessionId)
  }

  public getActiveSessionId(): string {
    return this.activeSessionId
  }

  public getActiveSession(): MediaSessionItem | undefined {
    return this.sessions.get(this.activeSessionId) || Array.from(this.sessions.values())[0]
  }

  public applyOptimisticTransport(action: string, sessionId?: string, value?: number | boolean): MediaSessionItem | undefined {
    const target = sessionId ? this.sessions.get(sessionId) : this.getActiveSession()
    if (!target) return undefined

    if (action === 'toggle') {
      target.isPlaying = !target.isPlaying
      target.status = target.isPlaying ? 'Playing' : 'Paused'
    } else if (action === 'play') {
      target.isPlaying = true
      target.status = 'Playing'
    } else if (action === 'pause') {
      target.isPlaying = false
      target.status = 'Paused'
    } else if (action === 'next' || action === 'forward') {
      if (target.durationSec > 0) {
        target.positionSec = Math.min(target.durationSec, target.positionSec + 10)
      }
    } else if (action === 'prev' || action === 'backward') {
      if (target.durationSec > 0) {
        target.positionSec = Math.max(0, target.positionSec - 10)
      }
    } else if (action === 'seek' && typeof value === 'number') {
      target.positionSec = Math.max(0, Math.min(target.durationSec, value))
    }

    return target
  }
}
