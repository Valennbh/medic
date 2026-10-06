'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Role = 'doctor' | 'assistant'

type ScheduleItem = {
  id: number
  doctor: string
  patient: string
  hour: string
  day: string
  status: 'Pendiente' | 'En Consulta' | 'Atendido'
}

const doctorSchedule: ScheduleItem[] = [
  { id: 1, doctor: 'Dr. Mendoza', patient: 'Lucía Torres', hour: '08:30', day: '2026-10-05', status: 'Pendiente' },
  { id: 2, doctor: 'Dr. Mendoza', patient: 'José Navarro', hour: '09:45', day: '2026-10-05', status: 'En Consulta' },
  { id: 3, doctor: 'Dr. Mendoza', patient: 'Mateo Ruiz', hour: '11:15', day: '2026-10-05', status: 'Pendiente' },
  { id: 4, doctor: 'Dr. Mendoza', patient: 'Ana Vidal', hour: '14:30', day: '2026-10-05', status: 'Atendido' },
  { id: 5, doctor: 'Dr. Mendoza', patient: 'Cristina Peña', hour: '16:00', day: '2026-10-05', status: 'Pendiente' },
]

const assistantSchedule: ScheduleItem[] = [
  { id: 11, doctor: 'Dr. Mendoza', patient: 'Lucía Torres', hour: '08:30', day: '2026-10-05', status: 'Pendiente' },
  { id: 12, doctor: 'Dra. García', patient: 'Mateo Ruiz', hour: '09:15', day: '2026-10-06', status: 'En Consulta' },
  { id: 13, doctor: 'Dr. López', patient: 'Ana Vidal', hour: '10:00', day: '2026-10-07', status: 'Atendido' },
  { id: 14, doctor: 'Dra. Ramírez', patient: 'José Navarro', hour: '11:45', day: '2026-10-08', status: 'Pendiente' },
  { id: 15, doctor: 'Dr. Mendoza', patient: 'Cristina Peña', hour: '14:15', day: '2026-10-09', status: 'Pendiente' },
  { id: 16, doctor: 'Dra. García', patient: 'Paula Cárdenas', hour: '15:30', day: '2026-10-10', status: 'En Consulta' },
  { id: 17, doctor: 'Dr. López', patient: 'Nicolás Ruiz', hour: '16:45', day: '2026-10-11', status: 'Atendido' },
]

const weekDays = [
  { key: '2026-10-05', label: 'Lun' },
  { key: '2026-10-06', label: 'Mar' },
  { key: '2026-10-07', label: 'Mié' },
  { key: '2026-10-08', label: 'Jue' },
  { key: '2026-10-09', label: 'Vie' },
  { key: '2026-10-10', label: 'Sáb' },
  { key: '2026-10-11', label: 'Dom' },
]

const timeSlots = Array.from({ length: 13 }, (_, index) => {
  const hour = 8 + index
  return `${String(hour).padStart(2, '0')}:00`
})

const doctorColorMap: Record<string, string> = {
  'Dr. Mendoza': 'bg-teal-100 text-teal-700 border-teal-200',
  'Dra. García': 'bg-amber-100 text-amber-800 border-amber-200',
  'Dr. López': 'bg-sky-100 text-sky-700 border-sky-200',
  'Dra. Ramírez': 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('') || 'MD'
}

export default function CalendarioPage() {
  const [role, setRole] = useState<Role>('assistant')
  const [ready, setReady] = useState(false)
  const [selectedDay, setSelectedDay] = useState('2026-10-05')
  const [selectedDoctor, setSelectedDoctor] = useState('Dr. Mendoza')

  useEffect(() => {
    let active = true

    async function loadRole() {
      const demoRole = localStorage.getItem('medic_dental_demo_role') as Role | null
      const demoSession = localStorage.getItem('medic_dental_demo_session') === 'true'

      if (demoSession && demoRole) {
        if (active) {
          setRole(demoRole)
          setReady(true)
        }
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return

      const currentRole = (user?.user_metadata?.role as Role) || 'assistant'
      setRole(currentRole)
      setReady(true)
    }

    loadRole()

    return () => {
      active = false
    }
  }, [])

  const currentDoctorAppointments = useMemo(
    () => doctorSchedule.filter((slot) => slot.day === selectedDay && slot.doctor === selectedDoctor),
    [selectedDay, selectedDoctor],
  )

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-center shadow-lg shadow-teal-900/5">
          <p className="text-lg font-semibold text-slate-700">Cargando calendario...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
              {getInitials(role === 'doctor' ? 'Dr. Mendoza' : 'Asistente Recepción')}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">Medic Dental ClíniCAS</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-800">
                {role === 'doctor' ? 'Vista por Día' : 'Vista por Semana'}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={role === 'doctor' ? '/doctor/dashboard' : '/asistente/dashboard'}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50"
            >
              {role === 'doctor' ? 'Mi agenda' : 'Panel general'}
            </Link>
            <Link
              href="/login"
              className="rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Cerrar sesión
            </Link>
          </div>
        </div>
      </header>

      {role === 'doctor' ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Agenda diaria del doctor</h2>
              <p className="text-sm text-slate-500">Turno del {selectedDay}</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="rounded-2xl border border-teal-300 bg-white p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Dr. Mendoza">Dr. Mendoza</option>
                <option value="Dra. García">Dra. García</option>
                <option value="Dr. López">Dr. López</option>
              </select>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="rounded-2xl border border-teal-300 bg-white p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            {timeSlots.map((slot) => {
              const item = currentDoctorAppointments.find((current) => current.hour === slot)

              return (
                <div key={slot} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="w-20 text-sm font-semibold text-slate-500">{slot}</div>
                  <div className="flex-1">
                    {item ? (
                      <div className={`flex flex-col gap-2 rounded-2xl border p-3 ${doctorColorMap[item.doctor]}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-bold">{item.patient}</span>
                          <span className="rounded-full bg-white/60 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em]">
                            {item.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-xs opacity-80">
                          <span>{item.doctor}</span>
                          <Link href="/pacientes/1" className="font-semibold underline underline-offset-2">
                            Abrir odontograma
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-400">
                        Libre
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Agenda general por semana</h2>
              <p className="text-sm text-slate-500">Vista global de la clínica</p>
            </div>
            
          </div>

          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-3" style={{ minWidth: '820px' }}>
              {weekDays.map((day) => {
                const cells = assistantSchedule.filter((entry) => entry.day === day.key)

                return (
                  <div key={day.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <span className="text-sm font-bold text-slate-700">{day.label}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                        {cells.length} citas
                      </span>
                    </div>

                    <div className="space-y-2">
                      {cells.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-2 py-4 text-center text-xs text-slate-400">
                          Libre
                        </div>
                      ) : (
                        cells.map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            className={`w-full rounded-2xl border p-2 text-left text-xs transition hover:-translate-y-0.5 ${doctorColorMap[entry.doctor]}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold">{entry.hour}</span>
                              <span className="rounded-full bg-white/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]">
                                {entry.status}
                              </span>
                            </div>
                            <p className="mt-2 font-semibold">{entry.patient}</p>
                            <p className="opacity-80">{entry.doctor}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
