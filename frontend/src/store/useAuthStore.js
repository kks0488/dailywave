import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  loading: true,
  isGuest: true,

  initialize: async () => {
    if (!isSupabaseConfigured()) {
      set({ loading: false, isGuest: true })
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    set({
      session,
      user: session?.user ?? null,
      loading: false,
      isGuest: !session
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isGuest: !session
      })
    })
  },

  signInWithGoogle: async () => {
    if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  },

  signInWithApple: async () => {
    if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  },

  signInWithGitHub: async () => {
    if (!isSupabaseConfigured()) return { error: 'Supabase not configured' }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  },

  signOut: async () => {
    if (!isSupabaseConfigured()) {
      set({ user: null, session: null, isGuest: true })
      return
    }
    
    await supabase.auth.signOut()
    set({ user: null, session: null, isGuest: true })
  },

  continueAsGuest: () => {
    set({ isGuest: true, loading: false })
  }
}))
