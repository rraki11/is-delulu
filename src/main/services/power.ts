import { execFile } from 'child_process'
import { shell } from 'electron'
import { PowerAction, QuickSettingTarget, ActionResult } from '../../shared/types'

export async function executePowerAction(action: PowerAction): Promise<ActionResult> {
  return new Promise((resolve) => {
    let file = ''
    let args: string[] = []

    switch (action) {
      case 'lock':
        file = 'rundll32.exe'
        args = ['user32.dll,LockWorkStation']
        break
      case 'sleep':
        file = 'rundll32.exe'
        args = ['powrprof.dll,SetSuspendState', '0,1,0']
        break
      case 'restart':
        file = 'shutdown.exe'
        args = ['/r', '/t', '0']
        break
      case 'shutdown':
        file = 'shutdown.exe'
        args = ['/s', '/t', '0']
        break
      default:
        return resolve({ success: false, message: `Unknown power action: ${action}` })
    }

    console.log(`[is-delulu:power] Executing verified power action '${action}': ${file} ${args.join(' ')}`)
    execFile(file, args, { windowsHide: true }, (err) => {
      if (err) {
        console.error(`[is-delulu:power] Error executing ${action}:`, err)
        resolve({ success: false, message: `Failed to execute ${action}: ${err.message}` })
      } else {
        resolve({ success: true, message: `Power action executed: ${action}` })
      }
    })
  })
}

export async function openQuickSetting(target: QuickSettingTarget): Promise<ActionResult> {
  try {
    let uri = ''
    switch (target) {
      case 'wifi':
        uri = 'ms-availablenetworks:'
        break
      case 'bluetooth':
        uri = 'ms-settings:bluetooth'
        break
      case 'audio':
        uri = 'ms-settings:sound'
        break
      case 'nightlight':
        uri = 'ms-settings:nightlight'
        break
      default:
        return { success: false, message: `Unknown quick setting: ${target}` }
    }

    console.log(`[is-delulu:power] Opening quick setting URI: ${uri}`)
    await shell.openExternal(uri)
    return { success: true, message: `Opened ${target} settings` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, message: `Error opening ${target}: ${msg}` }
  }
}
