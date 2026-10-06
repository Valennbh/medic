'use client'

import { jsPDF } from 'jspdf'
import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuthGuard } from '@/hooks/useAuthGuard'

interface DienteEstado {
  diente_numero: number
  estado: string
}

type ConsultaClinica = {
  id: number
  diagnostico: string
  medicacion: string
  created_at: string
}

type SpeechRecognitionInstance = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: any) => void) | null
  onend: (() => void) | null
  onerror: ((event: any) => void) | null
  start: () => void
  stop: () => void
}

const prescriptionOptions = ['Amoxicilina 500mg', 'Ibuprofeno 600mg', 'Clorhexidina']
const SUPERIOR_DERECHA = [18, 17, 16, 15, 14, 13, 12, 11]
const SUPERIOR_IZQUIERDA = [21, 22, 23, 24, 25, 26, 27, 28]
const INFERIOR_IZQUIERDA = [38, 37, 36, 35, 34, 33, 32, 31]
const INFERIOR_DERECHA = [41, 42, 43, 44, 45, 46, 47, 48]

export default function OdontogramaPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const pacienteId = resolvedParams.id

  const [paciente, setPaciente] = useState<{ id: string; nombre: string; dni: string; alertas_medicas: string } | null>(null)
  const [estadosDentales, setEstadosDentales] = useState<Record<number, string>>({})
  const [dienteSeleccionado, setDienteSeleccionado] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [activeTab, setActiveTab] = useState<'odontograma' | 'consultas'>('odontograma')
  const [diagnostico, setDiagnostico] = useState('')
  const [evolucion, setEvolucion] = useState('')
  const [medicacion, setMedicion] = useState('')
  const [consultas, setConsultas] = useState<ConsultaClinica[]>([])
  const [guardandoConsulta, setGuardandoConsulta] = useState(false)
  const [consultaFeedback, setConsultaFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isDoctor, setIsDoctor] = useState(false)
  const [doctorName, setDoctorName] = useState('Dr. Mendoza')
  const [copLicense, setCopLicense] = useState('COP-24567')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [selectedPrescriptionItems, setSelectedPrescriptionItems] = useState<string[]>(['Amoxicilina 500mg'])
  const [customPrescriptionDosage, setCustomPrescriptionDosage] = useState('1 tableta cada 8 horas por 5 días')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  useEffect(() => {
    cargarDatosPacienteYOdontograma()
    verificarAccesoDoctor()
  }, [pacienteId])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionCtor) return

    setVoiceSupported(true)
    const recognition = new SpeechRecognitionCtor() as SpeechRecognitionInstance
    recognition.lang = 'es-ES'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }
      setEvolucion((prev) => {
        const next = transcript.trim()
        return prev && next ? `${prev} ${next}` : prev || next
      })
    }
    recognition.onend = () => setIsRecording(false)
    recognition.onerror = () => setIsRecording(false)
    recognitionRef.current = recognition

    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [])

  async function verificarAccesoDoctor() {
    if (typeof window === 'undefined') return

    const demoRole = localStorage.getItem('medic_dental_demo_role')
    if (demoRole === 'doctor') {
      setDoctorName(localStorage.getItem('medic_dental_demo_name') || 'Dr. Mendoza')
      setIsDoctor(true)
      return
    }

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user || (user.user_metadata?.role as string | undefined) !== 'doctor') {
      setIsDoctor(false)
      return
    }

    setDoctorName((user.user_metadata?.full_name as string) || 'Dr. Mendoza')
    setCopLicense((user.user_metadata?.cop as string) || 'COP-24567')
    setIsDoctor(true)
  }

  async function cargarDatosPacienteYOdontograma() {
    setCargando(true)

    const { data: pacData } = await supabase
      .from('pacientes')
      .select('id, nombre, dni, alertas_medicas')
      .eq('dni', pacienteId)
      .single()

    if (pacData) setPaciente(pacData)

    const { data: odontoData } = await supabase
      .from('odontogramas')
      .select('diente_numero, estado')
      .eq('paciente_id', pacData?.id || pacienteId)

    if (odontoData) {
      const mapa: Record<number, string> = {}
      odontoData.forEach((item: DienteEstado) => {
        mapa[item.diente_numero] = item.estado
      })
      setEstadosDentales(mapa)
    }

    const { data: historialData } = await supabase
      .from('historial_consultas')
      .select('id, diagnostico, medicacion, created_at')
      .eq('paciente_id', pacData?.id || pacienteId)
      .order('created_at', { ascending: false })

    if (historialData) setConsultas(historialData as ConsultaClinica[])
    setCargando(false)
  }

  async function cambiarEstadoDiente(nuevoEstado: string) {
    if (dienteSeleccionado === null || !paciente) {
      console.log('Error: dienteSeleccionado =', dienteSeleccionado, 'paciente =', paciente)
      return
    }

    try {
      console.log('Guardando diente', dienteSeleccionado, 'con estado', nuevoEstado)
      const { error } = await supabase.from('odontogramas').upsert(
        [{ paciente_id: paciente.id, diente_numero: dienteSeleccionado, estado: nuevoEstado, updated_at: new Date() }],
        { onConflict: 'paciente_id, diente_numero' }
      )

      if (error) {
        console.error('Error de Supabase:', error.message)
        alert('Error al guardar estado: ' + error.message)
        return
      }

      console.log('Diente guardado exitosamente')
      setEstadosDentales((prev) => ({ ...prev, [dienteSeleccionado]: nuevoEstado }))
      setDienteSeleccionado(null)
    } catch (err: any) {
      console.error('Error al cambiar estado del diente:', err)
      alert('Error: ' + err.message)
    }
  }

  function handleVoiceToggle() {
    if (!isDoctor || !voiceSupported || !recognitionRef.current) return

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
      return
    }

    setIsRecording(true)
    recognitionRef.current.start()
  }

  async function guardarConsultaClinica() {
    const diagnosticoTrim = diagnostico.trim()
    const evolucionTrim = evolucion.trim()
    const medicacionTrim = medicacion.trim()
    const contenidoFinal = [diagnosticoTrim, evolucionTrim].filter(Boolean).join('\n\n')

    if (!contenidoFinal && !medicacionTrim) {
      setConsultaFeedback({ type: 'error', text: 'Escribe una evolución o una medicación antes de guardar.' })
      return
    }

    setGuardandoConsulta(true)
    setConsultaFeedback(null)

    const payload = {
      paciente_id: paciente?.id || pacienteId,
      diagnostico: contenidoFinal || 'Evolución clínica registrada.',
      medicacion: medicacionTrim,
      created_at: new Date().toISOString(),
    }

    try {
      const { data, error } = await supabase.from('historial_consultas').insert([payload]).select()
      if (error) throw error

      const nuevaConsulta = (data?.[0] ?? {
        id: Date.now(),
        diagnostico: payload.diagnostico,
        medicacion: payload.medicacion,
        created_at: new Date().toISOString(),
      }) as ConsultaClinica

      setConsultas((prev) => [nuevaConsulta, ...prev])
      setDiagnostico('')
      setEvolucion('')
      setMedicion('')
      setConsultaFeedback({ type: 'success', text: 'Consulta guardada correctamente.' })
    } catch (error: any) {
      const fallbackConsulta: ConsultaClinica = {
        id: Date.now(),
        diagnostico: payload.diagnostico,
        medicacion: payload.medicacion,
        created_at: new Date().toISOString(),
      }

      setConsultas((prev) => [fallbackConsulta, ...prev])
      setDiagnostico('')
      setEvolucion('')
      setMedicion('')
      setConsultaFeedback({
        type: 'error',
        text: 'No se pudo guardar en Supabase, pero la nota quedó guardada localmente para esta sesión.',
      })
    } finally {
      setGuardandoConsulta(false)
    }
  }

  function obtenerColorDiente(estado?: string) {
    switch (estado) {
      case 'caries':
        return 'bg-red-500 text-white border-red-600'
      case 'resina':
        return 'bg-blue-500 text-white border-blue-600'
      case 'extraccion':
        return 'bg-slate-800 text-white border-slate-900 line-through'
      case 'endodoncia':
        return 'bg-amber-500 text-white border-amber-600'
      default:
        return 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
    }
  }

  function togglePrescriptionItem(item: string) {
    setSelectedPrescriptionItems((prev) =>
      prev.includes(item) ? prev.filter((current) => current !== item) : [...prev, item]
    )
  }

  function generatePrescriptionPdf() {
    const items = selectedPrescriptionItems.length > 0 ? selectedPrescriptionItems : ['Sin prescripción seleccionada']

    const doc = new jsPDF()
    doc.setFillColor(13, 148, 136)
    doc.rect(0, 0, 210, 32, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.text('Medic Dental ClíniCAS', 14, 18)

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(12)
    doc.text(`Doctor: ${doctorName}`, 14, 45)
    doc.text(`COP / Licencia: ${copLicense}`, 14, 53)
    doc.text(`Paciente DNI: ${paciente?.dni || 'N/A'}`, 14, 61)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 69)

    doc.setFontSize(16)
    doc.setTextColor(13, 148, 136)
    doc.text('Receta Médica', 14, 86)

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(11)
    items.forEach((item, index) => {
      doc.text(`- ${item}`, 18, 98 + index * 8)
    })

    const customLine = customPrescriptionDosage.trim() || 'Sin indicaciones adicionales.'
    doc.text(`Indicaciones: ${customLine}`, 18, 98 + items.length * 8 + 12)
    doc.save(`receta-${paciente?.dni || 'paciente'}-${Date.now()}.pdf`)
  }

  function sendPrescriptionWhatsApp() {
    const items = selectedPrescriptionItems.length > 0 ? selectedPrescriptionItems : ['Sin prescripción seleccionada']
    const details = [
      'Medic Dental ClíniCAS',
      `Doctor: ${doctorName}`,
      `COP / Licencia: ${copLicense}`,
      `Paciente DNI: ${paciente?.dni || 'N/A'}`,
      `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
      '',
      'Receta médica:',
      ...items.map((item) => `- ${item}`),
      `Indicaciones: ${customPrescriptionDosage.trim() || 'Sin indicaciones adicionales.'}`,
    ].join('\n')

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(details)}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  if (cargando) {
    return <div className="p-8 text-center text-lg text-slate-600">Cargando expediente dental...</div>
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between rounded-3xl border border-teal-100 bg-teal-600 p-6 text-white shadow-lg shadow-teal-900/5">
        <div>
          <Link href="/" className="mb-2 inline-block text-sm font-semibold text-teal-50 hover:underline">
            ← Volver al portafolio
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{paciente?.nombre}</h1>
          <p className="text-sm text-teal-50">DNI: {paciente?.dni}</p>
          {paciente?.alertas_medicas && (
            <span className="mt-2 inline-block rounded-lg border border-amber-300 bg-amber-400 px-3 py-1 text-xs font-bold text-slate-900">
              ⚠️ Alerta: {paciente.alertas_medicas}
            </span>
          )}
        </div>
      </div>

      <div className="mb-6 flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('odontograma')}
          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${activeTab === 'odontograma' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          Odontograma
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('consultas')}
          className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${activeTab === 'consultas' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          Historial de Consultas
        </button>
      </div>

      {activeTab === 'odontograma' ? (
        <div className="grid gap-6 lg:grid-cols-[1.7fr_0.9fr]">
          <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-lg shadow-teal-900/5">
            <h2 className="mb-2 text-center text-xl font-bold text-slate-800">Odontograma Interactivo</h2>
            <p className="mb-6 text-center text-sm text-slate-500">
              {isDoctor ? 'Toca o haz clic en una pieza dental para registrar su estado clínico.' : 'Visualización del estado dental del paciente.'}
            </p>

            {!isDoctor && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Solo los doctores pueden editar el odontograma. Accede con tu cuenta de doctor para hacer cambios.
              </div>
            )}

            <div className="mb-8">
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Arcada Superior</p>
              <div className="flex flex-wrap justify-center gap-1 md:gap-2">
                {[...SUPERIOR_DERECHA, ...SUPERIOR_IZQUIERDA].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (isDoctor) setDienteSeleccionado(num)
                    }}
                    disabled={!isDoctor}
                    className={`flex h-16 w-12 flex-col items-center justify-center rounded-xl border-2 text-sm font-bold shadow-sm transition-all active:scale-95 md:h-20 md:w-14 ${obtenerColorDiente(estadosDentales[num])} ${!isDoctor ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-md'}`}
                  >
                    <span>{num}</span>
                    <span className="text-[10px] uppercase opacity-80">{estadosDentales[num]?.[0] || 'S'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap justify-center gap-1 md:gap-2">
                {[...INFERIOR_DERECHA, ...INFERIOR_IZQUIERDA].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (isDoctor) setDienteSeleccionado(num)
                    }}
                    disabled={!isDoctor}
                    className={`flex h-16 w-12 flex-col items-center justify-center rounded-xl border-2 text-sm font-bold shadow-sm transition-all active:scale-95 md:h-20 md:w-14 ${obtenerColorDiente(estadosDentales[num])} ${!isDoctor ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-md'}`}
                  >
                    <span>{num}</span>
                    <span className="text-[10px] uppercase opacity-80">{estadosDentales[num]?.[0] || 'S'}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Arcada Inferior</p>
            </div>
          </div>

          <aside className="rounded-3xl border border-teal-100 bg-white p-5 shadow-lg shadow-teal-900/5">
            <h3 className="text-xl font-bold text-slate-800">Historia clínica</h3>
            <p className="mt-1 text-sm text-slate-500">Notas y evolución general del paciente.</p>

            <div className="mt-5 space-y-3">
              {consultas.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  No hay registros de consultas aún.
                </div>
              ) : (
                consultas.slice(0, 3).map((consulta) => (
                  <div key={consulta.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800">Consulta</span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(consulta.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p>{consulta.diagnostico || 'Sin diagnóstico registrado'}</p>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      ) : (
        <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-lg shadow-teal-900/5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Historial de Consultas</h2>
              <p className="text-sm text-slate-500">Diagnóstico, tratamiento, evolución y medicación prescrita.</p>
            </div>
          </div>

          {consultaFeedback && (
            <div
              className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                consultaFeedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {consultaFeedback.text}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-slate-700">Evolución / Notas Clínicas</label>
                  {isDoctor && voiceSupported && (
                    <button
                      type="button"
                      aria-label="Dictado por voz"
                      onClick={handleVoiceToggle}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border text-lg transition ${
                        isRecording
                          ? 'animate-pulse border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/40'
                          : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      🎤
                    </button>
                  )}
                </div>
                <textarea
                  value={evolucion}
                  onChange={(e) => setEvolucion(e.target.value)}
                  rows={5}
                  placeholder="Ej. Paciente refiere dolor al masticar, mejora parcial tras tratamiento."
                  className="w-full rounded-2xl border border-teal-300 bg-white p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={!isDoctor}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Diagnóstico</label>
                <textarea
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                  rows={3}
                  placeholder="Ej. Gingivitis leve..."
                  className="w-full rounded-2xl border border-teal-300 bg-white p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={!isDoctor}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Medicación prescrita</label>
                <textarea
                  value={medicacion}
                  onChange={(e) => setMedicion(e.target.value)}
                  rows={4}
                  placeholder="Ej. Amoxicilina 500 mg cada 8 horas por 5 días..."
                  className="w-full rounded-2xl border border-teal-300 bg-white p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={!isDoctor}
                />
              </div>

              {isDoctor ? (
                <button
                  type="button"
                  onClick={guardarConsultaClinica}
                  disabled={guardandoConsulta}
                  className="w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardandoConsulta ? 'Guardando...' : 'Guardar consulta'}
                </button>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Solo los médicos pueden registrar evoluciones y prescripciones.
                </div>
              )}
            </div>

            <div className="space-y-4">
              {isDoctor && (
                <div className="rounded-3xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800">Emitir Receta Médica</h3>
                  <p className="mt-1 text-sm text-slate-600">Seleccione medicamentos y complete indicaciones.</p>

                  <div className="mt-4 grid gap-3">
                    {prescriptionOptions.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-3 rounded-xl border border-teal-100 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPrescriptionItems.includes(option)}
                          onChange={() => togglePrescriptionItem(option)}
                          className="h-4 w-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Dosis / Indicaciones</label>
                    <textarea
                      value={customPrescriptionDosage}
                      onChange={(e) => setCustomPrescriptionDosage(e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-teal-300 bg-white p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Ej. 1 tableta cada 8 horas por 5 días."
                    />
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={generatePrescriptionPdf}
                      className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700"
                    >
                      Generar Receta PDF
                    </button>
                    <button
                      type="button"
                      onClick={sendPrescriptionWhatsApp}
                      className="rounded-2xl border border-emerald-200 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-200"
                    >
                      Enviar por WhatsApp
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h3 className="mb-3 text-lg font-bold text-slate-800">Consultas registradas</h3>
                <div className="space-y-3">
                  {consultas.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      Aún no hay registros de consultas para este paciente.
                    </div>
                  ) : (
                    consultas.map((consulta) => (
                      <article key={consulta.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">Consulta</span>
                          <span className="text-xs text-slate-500">
                            {new Date(consulta.created_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-slate-700">
                          <div>
                            <p className="font-semibold text-slate-800">Diagnóstico</p>
                            <p>{consulta.diagnostico || 'Sin diagnóstico registrado'}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">Medicación</p>
                            <p>{consulta.medicacion || 'Sin medicación registrada'}</p>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {dienteSeleccionado !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-center text-xl font-bold text-slate-800">Pieza Dental N° {dienteSeleccionado}</h3>
            <p className="mb-6 text-center text-sm text-slate-500">Selecciona el diagnóstico o tratamiento:</p>

            <div className="grid grid-cols-1 gap-3">
              <button 
                type="button"
                onClick={() => cambiarEstadoDiente('sano')} 
                className="flex items-center justify-between rounded-xl bg-slate-100 p-4 text-left font-bold text-slate-800 hover:bg-slate-200 active:scale-95 transition-transform"
              >
                <span>🟢 Diente Sano</span>
              </button>
              <button 
                type="button"
                onClick={() => cambiarEstadoDiente('caries')} 
                className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-left font-bold text-red-700 hover:bg-red-100 active:scale-95 transition-transform"
              >
                <span>🔴 Caries</span>
              </button>
              <button 
                type="button"
                onClick={() => cambiarEstadoDiente('resina')} 
                className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4 text-left font-bold text-blue-700 hover:bg-blue-100 active:scale-95 transition-transform"
              >
                <span>🔵 Obturación / Resina</span>
              </button>
              <button 
                type="button"
                onClick={() => cambiarEstadoDiente('endodoncia')} 
                className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-left font-bold text-amber-700 hover:bg-amber-100 active:scale-95 transition-transform"
              >
                <span>🟡 Endodoncia</span>
              </button>
              <button 
                type="button"
                onClick={() => cambiarEstadoDiente('extraccion')} 
                className="flex items-center justify-between rounded-xl bg-slate-800 p-4 text-left font-bold text-white hover:bg-slate-900 active:scale-95 transition-transform"
              >
                <span>⚫ Extracción / Ausente</span>
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                type="button"
                onClick={() => setDienteSeleccionado(null)} 
                className="w-full rounded-xl bg-slate-200 py-3 font-semibold text-slate-700 hover:bg-slate-300 active:scale-95 transition-transform"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}