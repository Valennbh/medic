'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const DEMO_ACCOUNTS = {
  doctor: {
    email: 'doctor@medicdental.com',
    password: 'Demo123456!',
    full_name: 'Dr. Mendoza',
    role: 'doctor' as const,
  },
  assistant: {
    email: 'recepcion@medicdental.com',
    password: 'Demo123456!',
    full_name: 'Asistente Recepción',
    role: 'assistant' as const,
  },
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState(DEMO_ACCOUNTS.doctor.email)
  const [password, setPassword] = useState(DEMO_ACCOUNTS.doctor.password)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function checkExistingSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return

      if (!user) {
        const localRole = localStorage.getItem('medic_dental_demo_role') as 'doctor' | 'assistant' | null
        const localSession = localStorage.getItem('medic_dental_demo_session') === 'true'
        if (localSession && localRole) {
          router.replace(localRole === 'doctor' ? '/doctor/dashboard' : '/asistente/dashboard')
        }
        return
      }

      const currentRole = (user.user_metadata?.role as 'doctor' | 'assistant') || 'assistant'
      router.replace(currentRole === 'doctor' ? '/doctor/dashboard' : '/asistente/dashboard')
    }

    checkExistingSession()

    return () => {
      active = false
    }
  }, [router])

  function setDemoSession(account: (typeof DEMO_ACCOUNTS)[keyof typeof DEMO_ACCOUNTS]) {
    localStorage.setItem('medic_dental_demo_session', 'true')
    localStorage.setItem('medic_dental_demo_role', account.role)
    localStorage.setItem('medic_dental_demo_name', account.full_name)
    localStorage.setItem('medic_dental_demo_email', account.email)

    router.push(account.role === 'doctor' ? '/doctor/dashboard' : '/asistente/dashboard')
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password.trim()) {
      setError('Email y contraseña son obligatorios.')
      return
    }

    const demoMatch = Object.values(DEMO_ACCOUNTS).find(
      (account) => account.email === normalizedEmail && account.password === password
    )

    if (demoMatch) {
      setDemoSession(demoMatch)
      return
    }

    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (signInError) throw signInError

      if (!data.user) {
        throw new Error('No se pudo iniciar sesión.')
      }

      const currentRole = (data.user.user_metadata?.role as 'doctor' | 'assistant') || 'assistant'
      router.push(currentRole === 'doctor' ? '/doctor/dashboard' : '/asistente/dashboard')
      setSuccess('Inicio de sesión correcto.')
    } catch (signError: any) {
      setError(signError?.message || 'Ocurrió un error en la autenticación.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 md:p-8">
      <div className="w-full max-w-md rounded-3xl border border-teal-100 bg-white p-6 shadow-lg shadow-teal-900/5 md:p-8">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 text-2xl font-bold text-white shadow-md shadow-teal-600/25">
            MD
          </div>
        </div>

        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">Medic Dental ClíniCAS</p>

        <h1 className="mt-5 text-center text-3xl font-bold text-slate-800">Iniciar sesión</h1>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-700">
          <p className="font-bold text-slate-800">Cuenta demo disponible</p>
          <p className="mt-1">Doctor: {DEMO_ACCOUNTS.doctor.email} / {DEMO_ACCOUNTS.doctor.password}</p>
          <p>Recepción: {DEMO_ACCOUNTS.assistant.email} / {DEMO_ACCOUNTS.assistant.password}</p>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Correo institucional</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-teal-300 bg-white p-3 text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="usuario@medicdental.com"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-teal-300 bg-white p-3 text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-teal-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Procesando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setEmail(DEMO_ACCOUNTS.doctor.email)
              setPassword(DEMO_ACCOUNTS.doctor.password)
              setDemoSession(DEMO_ACCOUNTS.doctor)
            }}
            className="rounded-2xl bg-teal-100 px-3 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-200"
          >
            Entrar como Doctor Demo
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail(DEMO_ACCOUNTS.assistant.email)
              setPassword(DEMO_ACCOUNTS.assistant.password)
              setDemoSession(DEMO_ACCOUNTS.assistant)
            }}
            className="rounded-2xl bg-amber-100 px-3 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-200"
          >
            Entrar como Asistente Demo
          </button>
        </div>
      </div>
    </main>
  )
}
