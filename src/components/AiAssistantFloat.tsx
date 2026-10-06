'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

type Role = 'doctor' | 'assistant'

type Option = {
  label: string
  detail: string
}

const doctorOptions: Option[] = [
  { label: 'Ver agenda del día', detail: 'Revisa la programación actual y prioriza pacientes pendientes antes de comenzar la jornada.' },
  { label: 'Atender paciente', detail: 'Abre el expediente del paciente seleccionado para confirmar diagnóstico, tratamiento y notas.' },
  { label: 'Actualizar tratamiento', detail: 'Consulta la odontología y registra cambios en el plan, prescripciones o evolución clínica.' },
  { label: 'Comprobar alertas', detail: 'Revisa alergias, antecedentes o notas de riesgo antes de cada procedimiento.' },
]

const assistantOptions: Option[] = [
  { label: 'Organizar agenda', detail: 'Revisa citas pendientes, reasigna turnos y coordina disponibilidad de médicos.' },
  { label: 'Confirmar pacientes', detail: 'Verifica la lista de pacientes del día y prepara la recepción para cada cita.' },
  { label: 'Gestionar cambios', detail: 'Reagendar, reasignar doctor o actualizar el estado de atención cuando cambie la agenda.' },
  { label: 'Atención rápida', detail: 'Prioriza pacientes nuevos, urgencias o consultas ya programadas para este bloque.' },
]

export function AiAssistantFloat() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<Role>(() => {
    if (pathname.includes('/doctor/')) return 'doctor'
    return 'assistant'
  })
  const [selected, setSelected] = useState<Option | null>(null)

  const options = useMemo(() => (role === 'doctor' ? doctorOptions : assistantOptions), [role])

  function goToRoleView(nextRole: Role) {
    setRole(nextRole)
    setSelected(null)
    router.push(nextRole === 'doctor' ? '/doctor/dashboard' : '/asistente/dashboard')
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-3 w-[320px] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-600">IA clínica</p>
              <h3 className="text-lg font-bold text-slate-800">Agente Medic Dental</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cerrar
            </button>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => goToRoleView('assistant')}
              className={`rounded-2xl px-3 py-2 text-xs font-semibold ${role === 'assistant' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Asistente
            </button>
            <button
              type="button"
              onClick={() => goToRoleView('doctor')}
              className={`rounded-2xl px-3 py-2 text-xs font-semibold ${role === 'doctor' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Doctor
            </button>
          </div>

          <p className="mb-3 text-sm text-slate-600">
            ¿Qué deseas hacer hoy?
          </p>

          <div className="space-y-2">
            {options.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setSelected(option)}
                className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                  selected?.label === option.label
                    ? 'border-teal-200 bg-teal-50 text-teal-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-200 hover:bg-teal-50'
                }`}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
              </button>
            ))}
          </div>

          {selected && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-800">Sugerencia</p>
              <p className="mt-1">{selected.detail}</p>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-teal-600 to-cyan-500 text-xl font-bold text-white shadow-lg shadow-teal-600/30 transition hover:scale-105"
        aria-label="Abrir agente IA"
      >
        IA
      </button>
    </div>
  )
}
