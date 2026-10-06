'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Role = 'doctor' | 'assistant'
type AppointmentStatus = 'Pendiente' | 'En Consulta' | 'Atendido' | 'Cancelado'
type PatientStatus = 'espera' | 'atencion' | 'atendido'

type Appointment = {
  id: number
  hora: string
  paciente: string
  doctor: string
  estado: AppointmentStatus
}

type PatientStatusRow = {
  id: number | string
  nombre: string
  doctor: string
  motivo: string
  estado_atencion: PatientStatus
}

const doctors = [
  { id: 'dr-mendoza', nombre: 'Dr. Mendoza', especialidad: 'Implantología', turno: 'Mañana', pacientes: 7 },
  { id: 'dr-garcia', nombre: 'Dra. García', especialidad: 'Ortodoncia', turno: 'Tarde', pacientes: 5 },
  { id: 'dr-lopez', nombre: 'Dr. López', especialidad: 'Endodoncia', turno: 'Mañana', pacientes: 4 },
  { id: 'dr-ramirez', nombre: 'Dra. Ramírez', especialidad: 'Odontopediatría', turno: 'Tarde', pacientes: 6 },
]

const initialAppointments: Appointment[] = [
  { id: 1, paciente: 'Lucía Torres', hora: '08:30', doctor: 'Dr. Mendoza', estado: 'Pendiente' },
  { id: 2, paciente: 'Mateo Ruiz', hora: '09:15', doctor: 'Dra. García', estado: 'En Consulta' },
  { id: 3, paciente: 'Ana Vidal', hora: '10:00', doctor: 'Dr. López', estado: 'Atendido' },
  { id: 4, paciente: 'José Navarro', hora: '11:45', doctor: 'Dr. Mendoza', estado: 'Cancelado' },
]

const initialPatientStatusRows: PatientStatusRow[] = [
  { id: 1, nombre: 'Lucía Torres', doctor: 'Dr. Mendoza', motivo: 'Limpieza dental y control', estado_atencion: 'espera' },
  { id: 2, nombre: 'Mateo Ruiz', doctor: 'Dra. García', motivo: 'Revisión de caries', estado_atencion: 'atencion' },
  { id: 3, nombre: 'Ana Vidal', doctor: 'Dr. López', motivo: 'Endodoncia posterior', estado_atencion: 'atendido' },
  { id: 4, nombre: 'José Navarro', doctor: 'Dr. Mendoza', motivo: 'Control postoperatorio', estado_atencion: 'espera' },
]

const statusStyles: Record<AppointmentStatus, string> = {
  Pendiente: 'bg-amber-100 text-amber-800',
  'En Consulta': 'bg-teal-100 text-teal-700',
  Atendido: 'bg-emerald-100 text-emerald-700',
  Cancelado: 'bg-red-100 text-red-700',
}

const patientStatusStyles: Record<PatientStatus, string> = {
  espera: 'border border-amber-300 bg-amber-100 text-amber-900',
  atencion: 'border border-teal-300 bg-teal-100 text-teal-900',
  atendido: 'border border-slate-300 bg-slate-100 text-slate-600',
}

const patientStatusLabels: Record<PatientStatus, string> = {
  espera: 'En Sala de Espera',
  atencion: 'En Consulta',
  atendido: 'Atendido',
}

function initialsFromName(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('') || 'AR'
}

export default function AsistenteDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [patientStatusRows, setPatientStatusRows] = useState<PatientStatusRow[]>(initialPatientStatusRows)
  const [selectedDoctor, setSelectedDoctor] = useState('Todos')
  const [selectedStatus, setSelectedStatus] = useState('Todos')
  const [selectedDate, setSelectedDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [modal, setModal] = useState<{ type: 'schedule' | 'status' | 'doctor' | 'patient' | 'delete'; appointment?: Appointment } | null>(null)
  const [draft, setDraft] = useState({ patientName: '', doctor: 'Dr. Mendoza', status: 'Pendiente' as AppointmentStatus, hour: '09:00' })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [userName, setUserName] = useState('Asistente Recepción')

  useEffect(() => {
    let active = true

    async function verifyAccess() {
      const demoSession = localStorage.getItem('medic_dental_demo_session') === 'true'
      const demoRole = localStorage.getItem('medic_dental_demo_role')

      if (demoSession && demoRole === 'assistant') {
        setUserName(localStorage.getItem('medic_dental_demo_name') || 'Asistente Recepción')
        setReady(true)
        return
      }

      const { data: { user }, error } = await supabase.auth.getUser()
      if (!active) return

      if (error || !user || (user.user_metadata?.role as string | undefined) !== 'assistant') {
        window.location.href = '/login'
        return
      }

      setUserName((user.user_metadata?.full_name as string) || 'Asistente Recepción')
      setReady(true)
    }

    verifyAccess()

    return () => {
      active = false
    }
  }, [])

  const initials = useMemo(() => initialsFromName(userName), [userName])

  useEffect(() => {
    let isMounted = true

    async function loadPatientStatusRows() {
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nombre, doctor, motivo, estado_atencion')
        .limit(20)

      if (!isMounted || error) return

      if (data && data.length > 0) {
        setPatientStatusRows(
          data.map((row: any) => ({
            id: normalizePatientId(row.id, `${row.nombre || 'paciente'}-${Math.random()}`),
            nombre: row.nombre || 'Paciente',
            doctor: row.doctor || 'Dr. Mendoza',
            motivo: row.motivo || 'Consulta',
            estado_atencion: (row.estado_atencion as PatientStatus) || 'espera',
          })),
        )
      }
    }

    loadPatientStatusRows()

    const channel = supabase
      .channel('pacientes-status-channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pacientes' },
        (payload: any) => {
          const next = payload.new as { id?: number | string; nombre?: string; doctor?: string; motivo?: string; estado_atencion?: PatientStatus }
          if (!next?.id) return

          setPatientStatusRows((prev) => {
            const normalizedId = normalizePatientId(next.id, `fallback-${Date.now()}`)
            const existingIndex = prev.findIndex((item) => String(item.id) === String(normalizedId))
            const mapped = {
              id: normalizedId,
              nombre: next.nombre || 'Paciente',
              doctor: next.doctor || 'Dr. Mendoza',
              motivo: next.motivo || 'Consulta',
              estado_atencion: next.estado_atencion || 'espera',
            }

            if (existingIndex >= 0) {
              const nextList = [...prev]
              nextList[existingIndex] = mapped
              return nextList
            }

            return [mapped, ...prev]
          })
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  async function updateAppointmentInSupabase(appointmentId: number, payload: Partial<Appointment>) {
    try {
      await supabase.from('citas').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', appointmentId)
    } catch {
      // ignore if table does not exist in this demo environment
    }
  }

  async function updatePatientStatusInSupabase(patientId: number, status: PatientStatus) {
    try {
      const { error } = await supabase
        .from('pacientes')
        .update({ estado_atencion: status, updated_at: new Date().toISOString() })
        .eq('id', patientId)

      if (error) {
        throw error
      }
    } catch {
      // Demo fallback: local UI keeps working even if the table is not yet created.
    }
  }

  async function handleSignOut() {
    localStorage.removeItem('medic_dental_demo_session')
    localStorage.removeItem('medic_dental_demo_role')
    localStorage.removeItem('medic_dental_demo_name')
    localStorage.removeItem('medic_dental_demo_email')

    const { error } = await supabase.auth.signOut()
    if (!error) {
      window.location.href = '/login'
    } else {
      window.location.href = '/login'
    }
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

  const filteredAppointments = appointments.filter((appointment) => {
    const doctorOk = selectedDoctor === 'Todos' || appointment.doctor === selectedDoctor
    const dateOk = !selectedDate || appointment.hora === selectedDate
    const statusOk = selectedStatus === 'Todos' || appointment.estado === selectedStatus
    return doctorOk && dateOk && statusOk
  })

  const sortedByLastName = [...patientStatusRows].sort((a, b) => {
    const lastNameA = a.nombre.split(' ').pop() || a.nombre
    const lastNameB = b.nombre.split(' ').pop() || b.nombre
    return lastNameA.localeCompare(lastNameB)
  })

  const filteredPatientStatusRows = sortedByLastName
    .map((row, index) => ({ ...row, orderNumber: index + 1 }))
    .filter((row) => {
      const doctorOk = selectedDoctor === 'Todos' || row.doctor === selectedDoctor
      const query = searchQuery.toLowerCase().trim()

      if (!query) return doctorOk

      const matchName = row.nombre.toLowerCase().includes(query)
      const matchDNI = row.id?.toString().toLowerCase().includes(query)
      const matchOrderNumber = query.startsWith('#')
        ? row.orderNumber.toString() === query.slice(1)
        : row.orderNumber.toString() === query

      return doctorOk && (matchName || matchDNI || matchOrderNumber)
    })

  async function handleAction(type: 'schedule' | 'status' | 'doctor' | 'patient' | 'delete') {
    setActionLoading(type)
    try {
      if (!modal?.appointment && type !== 'schedule') {
        throw new Error('No hay cita seleccionada')
      }

      if (type === 'status') {
        setAppointments((prev) => prev.map((item) => item.id === modal!.appointment!.id ? { ...item, estado: draft.status } : item))
        setPatientStatusRows((prev) => prev.map((item) => item.id === modal!.appointment!.id ? { ...item, estado_atencion: draft.status as PatientStatus } : item))
        await updateAppointmentInSupabase(modal!.appointment!.id, { estado: draft.status })
        await updatePatientStatusInSupabase(modal!.appointment!.id, draft.status as PatientStatus)
        setMessage({ type: 'success', text: 'Estado actualizado correctamente.' })
      }

      if (type === 'doctor') {
        setAppointments((prev) => prev.map((item) => item.id === modal!.appointment!.id ? { ...item, doctor: draft.doctor } : item))
        await updateAppointmentInSupabase(modal!.appointment!.id, { doctor: draft.doctor })
        setMessage({ type: 'success', text: 'Doctor asignado actualizado.' })
      }

      if (type === 'patient') {
        setAppointments((prev) => prev.map((item) => item.id === modal!.appointment!.id ? { ...item, paciente: draft.patientName } : item))
        await updateAppointmentInSupabase(modal!.appointment!.id, { paciente: draft.patientName })
        setMessage({ type: 'success', text: 'Paciente actualizado correctamente.' })
      }

      if (type === 'schedule') {
        const newAppointment: Appointment = {
          id: Date.now(),
          paciente: draft.patientName || 'Paciente nuevo',
          doctor: draft.doctor,
          hora: draft.hour,
          estado: draft.status,
        }
        setAppointments((prev) => [newAppointment, ...prev])
        await updateAppointmentInSupabase(newAppointment.id, { ...newAppointment })
        setMessage({ type: 'success', text: 'Cita creada correctamente.' })
      }

      if (type === 'delete') {
        setAppointments((prev) => prev.filter((item) => item.id !== modal!.appointment!.id))
        await updateAppointmentInSupabase(modal!.appointment!.id, { estado: 'Cancelado' })
        setMessage({ type: 'success', text: 'Cita cancelada correctamente.' })
      }

      setModal(null)
      setDraft({ patientName: '', doctor: 'Dr. Mendoza', status: 'Pendiente', hour: '09:00' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'No se pudo completar la acción.' })
    } finally {
      setActionLoading(null)
    }
  }

  function openModal(type: 'schedule' | 'status' | 'doctor' | 'patient' | 'delete', appointment?: Appointment) {
    setModal({ type, appointment })
    if (appointment) {
      setDraft({
        patientName: appointment.paciente,
        doctor: appointment.doctor,
        status: appointment.estado,
        hour: appointment.hora,
      })
    }
  }

  async function handlePatientStatusChange(patientId: number, nextStatus: PatientStatus) {
    const safePatientId = normalizePatientId(patientId, `fallback-${Date.now()}`)

    setPatientStatusRows((prev) =>
      prev.map((patient) => (String(patient.id) === String(safePatientId) ? { ...patient, id: safePatientId, estado_atencion: nextStatus } : patient)),
    )

    await updatePatientStatusInSupabase(Number(safePatientId), nextStatus)
    setMessage({ type: 'success', text: `Estado de atención actualizado para el paciente.` })
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
              {initials}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">Medic Dental ClíniCAS</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-800">Bienvenido, {userName}</h1>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/asistente/dashboard" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50">Mi panel</Link>
            <Link href="/calendario" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50">Calendario</Link>
            <button type="button" onClick={handleSignOut} className="rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">Cerrar Sesión</button>
          </div>
        </div>
      </header>

      {message && (
        <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5"><p className="text-sm text-slate-500">Citas del día</p><p className="mt-2 text-3xl font-bold text-slate-800">{appointments.length}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5"><p className="text-sm text-slate-500">En espera</p><p className="mt-2 text-3xl font-bold text-amber-500">{appointments.filter((item) => item.estado === 'Pendiente').length}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5"><p className="text-sm text-slate-500">Atendidos</p><p className="mt-2 text-3xl font-bold text-teal-600">{appointments.filter((item) => item.estado === 'Atendido').length}</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5"><p className="text-sm text-slate-500">Cancelados</p><p className="mt-2 text-3xl font-bold text-slate-800">{appointments.filter((item) => item.estado === 'Cancelado').length}</p></div>
      </div>

      <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Gestión General de Citas</h2>
            <p className="text-sm text-slate-500">Agenda global y asignación por especialista</p>
          </div>
          <button onClick={() => openModal('schedule')} className="rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700">+ Cita</button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} className="rounded-2xl border border-teal-300 bg-white p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="Todos">Doctor asignado</option>
            {doctors.map((doctor) => <option key={doctor.id} value={doctor.nombre}>{doctor.nombre}</option>)}
          </select>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-2xl border border-teal-300 bg-white p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="rounded-2xl border border-teal-300 bg-white p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="Todos">Estado de atención</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Consulta">En Consulta</option>
            <option value="Atendido">Atendido</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Hora</th>
                <th className="px-4 py-3 font-semibold">Paciente</th>
                <th className="px-4 py-3 font-semibold">Doctor</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appointment) => (
                <tr key={appointment.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-800">{appointment.hora}</td>
                  <td className="px-4 py-3 text-slate-800">{appointment.paciente}</td>
                  <td className="px-4 py-3 text-slate-800">{appointment.doctor}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[appointment.estado]}`}>{appointment.estado}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openModal('schedule', appointment)} className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">Reagendar</button>
                      <button onClick={() => openModal('doctor', appointment)} className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">Cambiar doctor</button>
                      <button onClick={() => openModal('patient', appointment)} className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100">Editar</button>
                      <button onClick={() => openModal('status', appointment)} className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100">Estado</button>
                      <button onClick={() => openModal('delete', appointment)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Cancelar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Estado en tiempo real de pacientes</h2>
            <p className="text-sm text-slate-500">Actualización exclusiva del asistente para seguimiento clínico</p>
          </div>
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
            <span className="rounded-full bg-teal-100 px-3 py-1 font-bold text-teal-700">{filteredPatientStatusRows.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Paciente</th>
                <th className="px-4 py-3 font-semibold">Doctor</th>
                <th className="px-4 py-3 font-semibold">Motivo</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatientStatusRows.map((patient) => (
                <tr key={patient.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-700">#{patient.orderNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{patient.nombre}</td>
                  <td className="px-4 py-3 text-slate-800">{patient.doctor}</td>
                  <td className="px-4 py-3 text-slate-600">{patient.motivo}</td>
                  <td className="px-4 py-3">
                    <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${patientStatusStyles[patient.estado_atencion]}`}>
                      {patientStatusLabels[patient.estado_atencion]}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/pacientes/${patient.id}`} className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100">
                      Abrir archivo
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-teal-900/5">
        <h2 className="mb-4 text-xl font-bold text-slate-800">Directorio de Doctores</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...doctors].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((doctor) => (
            <Link key={doctor.id} href="/doctores" className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-teal-300 hover:bg-teal-50">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-slate-900">{doctor.turno}</span>
                <span className="text-xs font-semibold text-slate-500">{doctor.pacientes} citas</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">{doctor.nombre}</h3>
              <p className="text-sm text-teal-700">{doctor.especialidad}</p>
              <p className="mt-3 text-sm text-slate-500">Agenda del día disponible</p>
            </Link>
          ))}
        </div>
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-slate-800">
              {modal.type === 'schedule' ? 'Nueva cita' : modal.type === 'status' ? 'Cambiar estado' : modal.type === 'doctor' ? 'Cambiar doctor' : modal.type === 'patient' ? 'Editar paciente' : 'Cancelar cita'}
            </h3>

            <div className="mt-4 space-y-4">
              {(modal.type === 'schedule' || modal.type === 'patient') && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Paciente</label>
                  <input value={draft.patientName} onChange={(e) => setDraft((prev) => ({ ...prev, patientName: e.target.value }))} className="w-full rounded-2xl border border-teal-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              )}

              {(modal.type === 'schedule' || modal.type === 'doctor') && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Doctor</label>
                  <select value={draft.doctor} onChange={(e) => setDraft((prev) => ({ ...prev, doctor: e.target.value }))} className="w-full rounded-2xl border border-teal-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {doctors.map((doctor) => <option key={doctor.id} value={doctor.nombre}>{doctor.nombre}</option>)}
                  </select>
                </div>
              )}

              {(modal.type === 'schedule' || modal.type === 'status') && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Estado</label>
                  <select value={draft.status} onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value as AppointmentStatus }))} className="w-full rounded-2xl border border-teal-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Consulta">En Consulta</option>
                    <option value="Atendido">Atendido</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              )}

              {(modal.type === 'schedule' || modal.type === 'doctor') && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Hora</label>
                  <input type="time" value={draft.hour} onChange={(e) => setDraft((prev) => ({ ...prev, hour: e.target.value }))} className="w-full rounded-2xl border border-teal-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancelar</button>
              <button disabled={actionLoading !== null} onClick={() => handleAction(modal.type === 'delete' ? 'delete' : modal.type)} className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                {actionLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function normalizePatientId(value: unknown, fallback: string) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}
