'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type AppointmentStatus = 'Pendiente' | 'En Consulta' | 'Atendido' | 'Cancelado'

type Appointment = {
  id: number
  hora: string
  paciente: string
  doctor: string
  estado: AppointmentStatus
  fecha: string
}

type ModalType = 'schedule' | 'doctor' | 'patient' | 'status' | null

const doctors = [
  { nombre: 'Dr. Mendoza', especialidad: 'Implantología', turno: 'Mañana', pacientes: 7 },
  { nombre: 'Dra. García', especialidad: 'Ortodoncia', turno: 'Tarde', pacientes: 5 },
  { nombre: 'Dr. López', especialidad: 'Endodoncia', turno: 'Mañana', pacientes: 4 },
  { nombre: 'Dra. Ramírez', especialidad: 'Odontopediatría', turno: 'Tarde', pacientes: 6 },
]

const initialAppointments: Appointment[] = [
  { id: 1, hora: '08:30', paciente: 'Lucía Torres', doctor: 'Dr. Mendoza', estado: 'Pendiente', fecha: '2026-10-05' },
  { id: 2, hora: '09:15', paciente: 'Mateo Ruiz', doctor: 'Dra. García', estado: 'En Consulta', fecha: '2026-10-05' },
  { id: 3, hora: '10:00', paciente: 'Ana Vidal', doctor: 'Dr. López', estado: 'Atendido', fecha: '2026-10-06' },
  { id: 4, hora: '11:45', paciente: 'José Navarro', doctor: 'Dr. Mendoza', estado: 'Cancelado', fecha: '2026-10-06' },
]

export default function RecepcionPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [selectedDoctor, setSelectedDoctor] = useState('Todos')
  const [selectedStatus, setSelectedStatus] = useState('Todos')
  const [selectedDate, setSelectedDate] = useState('2026-10-05')
  const [modal, setModal] = useState<{ type: ModalType; appointment?: Appointment } | null>(null)
  const [draft, setDraft] = useState({ patientName: '', doctor: 'Dr. Mendoza', status: 'Pendiente' as AppointmentStatus, hour: '09:00', date: '2026-10-05' })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const doctorOk = selectedDoctor === 'Todos' || appointment.doctor === selectedDoctor
      const dateOk = !selectedDate || appointment.fecha === selectedDate
      const statusOk = selectedStatus === 'Todos' || appointment.estado === selectedStatus
      return doctorOk && dateOk && statusOk
    })
  }, [appointments, selectedDoctor, selectedStatus, selectedDate])

  function openModal(type: Exclude<ModalType, null>, appointment?: Appointment) {
    if (appointment) {
      setDraft({
        patientName: appointment.paciente,
        doctor: appointment.doctor,
        status: appointment.estado,
        hour: appointment.hora,
        date: appointment.fecha,
      })
    } else {
      setDraft({
        patientName: '',
        doctor: 'Dr. Mendoza',
        status: 'Pendiente',
        hour: '09:00',
        date: selectedDate || '2026-10-05',
      })
    }

    setModal({ type, appointment })
  }

  function closeModal() {
    setModal(null)
    setMessage(null)
  }

  function handleAction() {
    if (!modal) return

    if (modal.type === 'schedule') {
      const nextAppointment: Appointment = {
        id: Date.now(),
        paciente: draft.patientName || 'Paciente nuevo',
        doctor: draft.doctor,
        estado: draft.status,
        hora: draft.hour,
        fecha: draft.date,
      }

      setAppointments((prev) => [nextAppointment, ...prev])
      setMessage({ type: 'success', text: 'Cita creada correctamente.' })
      setSelectedDate(draft.date)
      setModal(null)
      return
    }

    if (!modal.appointment) return

    setAppointments((prev) =>
      prev.map((item) => {
        if (item.id !== modal.appointment!.id) return item

        if (modal.type === 'doctor') return { ...item, doctor: draft.doctor }
        if (modal.type === 'patient') return { ...item, paciente: draft.patientName }
        if (modal.type === 'status') return { ...item, estado: draft.status }
        return item
      }),
    )

    setMessage({ type: 'success', text: 'Cambios guardados correctamente.' })
    setModal(null)
  }

  function handleQuickStatusChange(appointment: Appointment, nextStatus: AppointmentStatus) {
    setAppointments((prev) =>
      prev.map((item) => (item.id === appointment.id ? { ...item, estado: nextStatus } : item)),
    )
    setMessage({ type: 'success', text: `Estado de ${appointment.paciente} actualizado a ${nextStatus}.` })
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="mb-8 rounded-2xl border border-teal-500 bg-teal-600 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-100">Medic Dental ClíniCAS</p>
            <h1 className="mt-2 text-3xl font-bold">Panel de Recepción</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">Vista principal</Link>
            <Link href="/doctores" className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">Doctores</Link>
          </div>
        </div>
      </header>

      {message && (
        <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Citas del día</p><p className="mt-2 text-3xl font-bold text-slate-800">{appointments.length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">En espera</p><p className="mt-2 text-3xl font-bold text-amber-500">{appointments.filter((item) => item.estado === 'Pendiente').length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Atendidos</p><p className="mt-2 text-3xl font-bold text-teal-600">{appointments.filter((item) => item.estado === 'Atendido').length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">Cancelaciones</p><p className="mt-2 text-3xl font-bold text-slate-800">{appointments.filter((item) => item.estado === 'Cancelado').length}</p></div>
      </section>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Gestión General de Citas</h2>
            <p className="text-sm text-slate-500">Agenda general y filtros rápidos</p>
          </div>
          <button type="button" onClick={() => openModal('schedule')} className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700">+ Cita</button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} className="rounded-xl border border-teal-300 bg-white p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="Todos">Doctor asignado</option>
            {doctors.map((doctor) => (
              <option key={doctor.nombre} value={doctor.nombre}>{doctor.nombre}</option>
            ))}
          </select>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-xl border border-teal-300 bg-white p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="rounded-xl border border-teal-300 bg-white p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500">
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
              {filteredAppointments.map((cita) => (
                <tr key={`${cita.id}-${cita.hora}`} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-800">{cita.hora}</td>
                  <td className="px-4 py-3 text-slate-800">{cita.paciente}</td>
                  <td className="px-4 py-3 text-slate-800">{cita.doctor}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${cita.estado === 'Pendiente' ? 'bg-amber-100 text-amber-800' : cita.estado === 'En Consulta' ? 'bg-teal-100 text-teal-700' : cita.estado === 'Atendido' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {cita.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openModal('doctor', cita)} className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">Reagendar</button>
                      <button type="button" onClick={() => handleQuickStatusChange(cita, 'En Consulta')} className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">Cambiar doctor</button>
                      <button type="button" onClick={() => openModal('patient', cita)} className="rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100">Editar</button>
                      <button type="button" onClick={() => handleQuickStatusChange(cita, 'Atendido')} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">Atender</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-800">Directorio de Doctores</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {doctors.map((doctor) => (
            <Link key={doctor.nombre} href="/doctores" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-teal-300 hover:bg-teal-50">
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
              {modal.type === 'schedule' ? 'Nueva cita' : modal.type === 'status' ? 'Cambiar estado' : modal.type === 'doctor' ? 'Cambiar doctor' : 'Editar paciente'}
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
                    {doctors.map((doctor) => <option key={doctor.nombre} value={doctor.nombre}>{doctor.nombre}</option>)}
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

              {modal.type === 'schedule' && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Fecha</label>
                  <input type="date" value={draft.date} onChange={(e) => setDraft((prev) => ({ ...prev, date: e.target.value }))} className="w-full rounded-2xl border border-teal-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancelar</button>
              <button type="button" onClick={handleAction} className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
