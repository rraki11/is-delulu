import { AudioOutputItem } from '../../shared/types'

export class AudioSessionService {
  private audioOutputs: AudioOutputItem[] = []
  private masterVolume: number = 75
  private masterMuted: boolean = false

  public updateOutputs(outputs: AudioOutputItem[], masterVol?: number, masterMute?: boolean): void {
    this.audioOutputs = [...outputs]
    if (typeof masterVol === 'number') {
      this.masterVolume = Math.max(0, Math.min(100, Math.round(masterVol)))
    }
    if (typeof masterMute === 'boolean') {
      this.masterMuted = masterMute
    }
  }

  public getOutputs(): AudioOutputItem[] {
    return [...this.audioOutputs]
  }

  public getMasterVolume(): number {
    return this.masterVolume
  }

  public isMasterMuted(): boolean {
    return this.masterMuted
  }

  public applyOptimisticMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(100, Math.round(volume)))
    if (this.masterVolume === 0) {
      this.masterMuted = true
    }
  }

  public applyOptimisticMasterMute(mute?: boolean): void {
    if (typeof mute === 'boolean') {
      this.masterMuted = mute
    } else {
      this.masterMuted = !this.masterMuted
    }
  }

  public applyOptimisticAppVolume(processId: number, volume: number): void {
    const target = this.audioOutputs.find((o) => o.processId === processId)
    if (target) {
      target.volume = Math.max(0, Math.min(100, Math.round(volume)))
      target.isMuted = target.volume === 0
    }
  }

  public applyOptimisticAppMute(processId: number, mute?: boolean): void {
    const target = this.audioOutputs.find((o) => o.processId === processId)
    if (target) {
      if (typeof mute === 'boolean') {
        target.isMuted = mute
      } else {
        target.isMuted = !target.isMuted
      }
    }
  }
}
