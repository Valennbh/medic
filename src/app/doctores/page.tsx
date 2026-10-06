'use client'

import Link from 'next/link'

const doctores = [
  { nombre: 'Dr. Mendoza', especialidad: 'Implantología', turno: 'Mañana', pacientes: 7 },
  { nombre: 'Dra. García', especialidad: 'Ortodoncia', turno: 'Tarde', pacientes: 5 },
  { nombre: 'Dr. López', especialidad: 'Endodoncia', turno: 'Mañana', pacientes: 4 },
  { nombre: 'Dra. Ramírez', especialidad: 'Odontopediatría', turno: 'Tarde', pacientes: 6 },
]

export default function DoctoresPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="mb-8 rounded-2xl border border-teal-500 bg-teal-600 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-100">Medic Dental ClíniCAS</p>
            <h1 className="mt-2 text-3xl font-bold">Directorio de Doctores</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">Vista principal</Link>
            <Link href="/recepcion" className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">Recepción</Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {doctores.map((doctor) => (
          <Link key={doctor.nombre} href="/doctor/dashboard" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:bg-teal-50">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-slate-900">{doctor.turno}</span>
              <span className="text-xs font-semibold text-slate-500">{doctor.pacientes} citas</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">{doctor.nombre}</h2>
            <p className="mt-1 text-sm text-teal-700">{doctor.especialidad}</p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-700">Agenda del día</p>
              <p className="mt-1">Disponible para atención clínica</p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  )
}
