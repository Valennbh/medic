'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

const pacientes = [
  { hora: '08:30', dni: '20876543', nombre: 'Lucía Torres', motivo: 'Limpieza dental y control', alerta: 'Alergia a la penicilina' },
  { hora: '09:00', dni: '19887765', nombre: 'Mateo Ruiz', motivo: 'Revisión de caries', alerta: '' },
  { hora: '10:30', dni: '22123456', nombre: 'Ana Vidal', motivo: 'Endodoncia posterior', alerta: 'Hipertensión' },
  { hora: '11:15', dni: '23456789', nombre: 'José Navarro', motivo: 'Control postoperatorio', alerta: '' },
].sort((a, b) => a.hora.localeCompare(b.hora))

const estadoPacienteStyles: Record<'espera' | 'atencion' | 'atendido', string> = {
  espera: 'border border-amber-300 bg-amber-100 text-amber-900',
  atencion: 'border border-teal-300 bg-teal-100 text-teal-900',
  atendido: 'border border-slate-300 bg-slate-100 text-slate-600',
}

const estadoPacienteLabels: Record<'espera' | 'atencion' | 'atendido', string> = {
  espera: 'En Sala de Espera',
  atencion: 'En Consulta',
  atendido: 'Atendido',
}

const pacientesEstado = [
  { id: 1, nombre: 'Lucía Torres', doctor: 'Dr. Mendoza', motivo: 'Limpieza dental y control', estado: 'espera' as const },
  { id: 2, nombre: 'Mateo Ruiz', doctor: 'Dr. Mendoza', motivo: 'Revisión de caries', estado: 'atencion' as const },
  { id: 3, nombre: 'Ana Vidal', doctor: 'Dr. Mendoza', motivo: 'Endodoncia posterior', estado: 'atendido' as const },
  { id: 4, nombre: 'José Navarro', doctor: 'Dr. Mendoza', motivo: 'Control postoperatorio', estado: 'espera' as const },
]

function getLastName(name: string) {
  const parts = name.split(' ').filter(Boolean)
  return parts[parts.length - 1] || 'Profesional'
}

export default function DoctorDashboardPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userName, setUserName] = useState('Dr. Mendoza')
  const [actionBusy, setActionBusy] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let mounted = true

    async function verifyAccess() {
      const demoSession = localStorage.getItem('medic_dental_demo_session') === 'true'
      const demoRole = localStorage.getItem('medic_dental_demo_role')

      if (demoSession && demoRole === 'doctor') {
        setUserName(localStorage.getItem('medic_dental_demo_name') || 'Dr. Mendoza')
        setReady(true)
        return
      }

      const { data: { user }, error } = await supabase.auth.getUser()
      if (!mounted) return

      if (error || !user || (user.user_metadata?.role as string | undefined) !== 'doctor') {
        router.replace('/login')
        return
      }

      setUserName((user.user_metadata?.full_name as string) || 'Dr. Mendoza')
      setReady(true)
    }

    verifyAccess()

    return () => {
      mounted = false
    }
  }, [router])

  const lastName = useMemo(() => getLastName(userName), [userName])

  async function handleSignOut() {
    setActionBusy(true)
    localStorage.removeItem('medic_dental_demo_session')
    localStorage.removeItem('medic_dental_demo_role')
    localStorage.removeItem('medic_dental_demo_name')
    localStorage.removeItem('medic_dental_demo_email')

    const { error } = await supabase.auth.signOut()
    if (!error) {
      router.push('/login')
      router.refresh()
      return
    }

    router.push('/login')
    setActionBusy(false)
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg shadow-teal-900/5">
          <p className="text-lg font-semibold text-slate-700">Verificando acceso...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
              {userName
                .split(' ')
                .filter(Boolean)
                .map((part) => part[0]?.toUpperCase())
                .slice(0, 2)
                .join('') || 'MD'}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">Medic Dental ClíniCAS</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-800">Bienvenido, Dr. {lastName}</h1>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push('/calendario')}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50"
            >
              Mi agenda
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={actionBusy}
              className="rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {actionBusy ? 'Cerrando...' : 'Cerrar Sesión'}
            </button>
          </div>
        </div>
      </header>

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5"><p className="text-sm text-slate-500">Citas totales de hoy</p><p className="mt-2 text-3xl font-bold text-slate-800">12</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5"><p className="text-sm text-slate-500">Pacientes en espera</p><p className="mt-2 text-3xl font-bold text-amber-500">4</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5"><p className="text-sm text-slate-500">Atenciones completadas</p><p className="mt-2 text-3xl font-bold text-teal-600">7</p></div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-bold text-slate-800">Pacientes programados para hoy</h2>
        </div>

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-md">
            <input
              type="text"
              placeholder="Buscar por nombre, DNI o #orden (ej: #1, #2, #3)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-teal-300 bg-white px-4 py-3 pr-10 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 p-1 text-slate-600 hover:bg-slate-300"
                aria-label="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-semibold">Resultados:</span>
            <span className="rounded-full bg-teal-100 px-3 py-1 font-bold text-teal-700">
              {pacientes
                .filter((p) => {
                  const query = searchQuery.toLowerCase().trim()
                  if (!query) return true
                  return (
                    p.nombre.toLowerCase().includes(query) ||
                    p.dni.includes(query)
                  )
                })
                .length.toString()}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Hora</th>
                <th className="px-4 py-3 font-semibold">DNI</th>
                <th className="px-4 py-3 font-semibold">Apellidos y Nombres</th>
                <th className="px-4 py-3 font-semibold">Motivo</th>
                <th className="px-4 py-3 font-semibold">Alerta</th>
                <th className="px-4 py-3 font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {pacientes
                .filter((p) => {
                  const query = searchQuery.toLowerCase().trim()
                  if (!query) return true
                  return (
                    p.nombre.toLowerCase().includes(query) ||
                    p.dni.includes(query)
                  )
                })
                .map((paciente, index) => (
                  <tr key={`${paciente.hora}-${paciente.dni}`} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-700">#{index + 1}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{paciente.hora}</td>
                    <td className="px-4 py-3 text-slate-800">{paciente.dni}</td>
                    <td className="px-4 py-3 text-slate-800">{paciente.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{paciente.motivo}</td>
                    <td className="px-4 py-3">
                      {paciente.alerta ? <span className="inline-flex rounded-full bg-amber-400 px-2 py-1 text-xs font-bold text-slate-900">🚨 {paciente.alerta}</span> : <span className="text-xs text-slate-400">Sin alertas</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/pacientes/${paciente.dni}`} className="inline-flex rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700">
                        Atender / Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5">
        <h2 className="mb-4 text-xl font-bold text-slate-800">Estado de los pacientes</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {pacientesEstado.map((paciente) => (
            <div key={paciente.id} className={`rounded-xl p-4 ${estadoPacienteStyles[paciente.estado]}`}>
              <h3 className="text-lg font-semibold text-slate-800">{paciente.nombre}</h3>
              <p className="text-sm text-slate-500">{paciente.motivo}</p>
              <span className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {estadoPacienteLabels[paciente.estado]}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
