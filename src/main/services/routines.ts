import { DesktopRoutine } from '../../shared/types'
import { DEFAULT_ROUTINES } from '../../shared/constants'
import { clearClipboard } from './clipboard'

let routines: DesktopRoutine[] = [...DEFAULT_ROUTINES]

export function getRoutines(): DesktopRoutine[] {
  return [...routines]
}

export function toggleRoutine(id: string): DesktopRoutine[] {
  routines = routines.map((r) => {
    if (r.id === id) {
      const nextActive = !r.isActive
      if (nextActive && id === 'clean-slate') {
        clearClipboard()
      }
      return { ...r, isActive: nextActive }
    }
    return r
  })
  return [...routines]
}
