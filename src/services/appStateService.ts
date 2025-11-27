import type { AppState } from '@/types'

const APP_STATE_KEY = 'pdf_packet_builder_app_state'

class AppStateService {
  async loadAppState(): Promise<AppState | null> {
    try {
      const stored = localStorage.getItem(APP_STATE_KEY)
      if (!stored) return null

      const parsed = JSON.parse(stored)
      return {
        currentStep: parsed.currentStep || 1,
        formData: parsed.formData || {},
        selectedDocuments: parsed.selectedDocuments || [],
        isGenerating: false,
        darkMode: parsed.darkMode || false
      }
    } catch (error) {
      console.error('Error loading app state:', error)
      return null
    }
  }

  async saveAppState(state: AppState): Promise<void> {
    try {
      const toStore = {
        currentStep: state.currentStep,
        formData: state.formData,
        selectedDocuments: state.selectedDocuments,
        darkMode: state.darkMode
      }
      localStorage.setItem(APP_STATE_KEY, JSON.stringify(toStore))
    } catch (error) {
      console.error('Error saving app state:', error)
    }
  }

  async clearAppState(): Promise<void> {
    try {
      localStorage.removeItem(APP_STATE_KEY)
    } catch (error) {
      console.error('Error clearing app state:', error)
    }
  }
}

export const appStateService = new AppStateService()
