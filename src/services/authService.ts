import { supabase } from '@/lib/supabaseClient'

export class AuthService {
  async signInAdmin(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw new Error(error.message || 'Invalid login credentials')
      }

      if (!data.user) {
        throw new Error('Authentication failed')
      }

      return { user: { id: data.user.id, email: data.user.email || '' } }
    } catch (err) {
      if (err instanceof Error) {
        throw err
      }
      throw new Error('Authentication failed')
    }
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
    } catch (err) {
      console.error('Sign out error:', err)
      throw err
    }
  }

  async getUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        return null
      }
      return user
    } catch {
      return null
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await this.getUser()
      return user !== null
    } catch {
      return false
    }
  }

  onAuthStateChange(callback: (isAuthenticated: boolean) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        callback(session !== null)
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }
}

export const authService = new AuthService()
