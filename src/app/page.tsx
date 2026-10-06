'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    let active = true

    async function resolveAccess() {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (!active) return

      if (error || !user) {
        router.replace('/login')
        return
      }

      const role = (user.user_metadata?.role as 'doctor' | 'assistant') || 'assistant'
      router.replace(role === 'doctor' ? '/doctor/dashboard' : '/asistente/dashboard')
    }

    resolveAccess()

    return () => {
      active = false
    }
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/40 to-slate-100 p-6">
      <div className="rounded-3xl border border-teal-100 bg-white/80 backdrop-blur-sm px-10 py-8 text-center shadow-lg shadow-teal-900/5 transition-all duration-300 hover:shadow-xl hover:shadow-teal-900/10 hover:-translate-y-1">
        
        {/* Pequeño indicador visual estético */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
          <span className="text-2xl font-bold text-teal-600">+</span>
        </div>

        <h1 className="mb-2 text-xl font-bold text-slate-800">Medic Dental ClíniCAS</h1>
        <p className="text-sm font-medium text-teal-600/80 animate-pulse">
          Preparando tu consultorio...
        </p>

      </div>
    </main>
  )
}