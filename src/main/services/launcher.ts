import { app, shell } from 'electron'
import { execFile } from 'child_process'
import { ActionResult } from '../../shared/types'

const ALLOWED_EXECUTABLES: Record<string, string> = {
  'explorer.exe': 'explorer.exe',
  'calc.exe': 'calc.exe',
  'notepad.exe': 'notepad.exe',
  'taskmgr.exe': 'taskmgr.exe',
  'powershell.exe': 'powershell.exe',
  'wt.exe': 'wt.exe'
}

export async function launchTarget(target: string): Promise<ActionResult> {
  try {
    // 1. Check for special known folders
    if (target === 'downloads') {
      const downloadsPath = app.getPath('downloads')
      const err = await shell.openPath(downloadsPath)
      if (err) return { success: false, message: `Failed to open Downloads: ${err}` }
      return { success: true, message: 'Opened Downloads folder' }
    }

    if (target === 'documents') {
      const docPath = app.getPath('documents')
      const err = await shell.openPath(docPath)
      if (err) return { success: false, message: `Failed to open Documents: ${err}` }
      return { success: true, message: 'Opened Documents folder' }
    }

    // 2. Check for safe web URLs
    if (target.startsWith('https://') || target.startsWith('http://')) {
      await shell.openExternal(target)
      return { success: true, message: `Opened URL: ${target}` }
    }

    // 3. Check for whitelisted system executables
    if (ALLOWED_EXECUTABLES[target]) {
      const exe = ALLOWED_EXECUTABLES[target]
      execFile(exe, [], (err) => {
        if (err) console.error(`Error launching ${exe}:`, err)
      })
      return { success: true, message: `Launched ${target}` }
    }

    // 4. Fallback for VS Code or developer tools
    if (target === 'code') {
      execFile('cmd.exe', ['/c', 'code'], (err) => {
        if (err) console.warn('Could not launch VS Code directly:', err)
      })
      return { success: true, message: 'Invoked VS Code command' }
    }

    return { success: false, message: `Unrecognized or prohibited target: ${target}` }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, message: `Error: ${msg}` }
  }
}
