import { IsDeluluAPI } from '../shared/types'

declare global {
  interface Window {
    isDelulu: IsDeluluAPI
  }
}
