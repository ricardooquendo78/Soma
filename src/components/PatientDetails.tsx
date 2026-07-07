import React, { useState } from 'react';
import { Patient, Evaluation } from '../types';
import { calculateChronologicalAge, calculateEvaluation, ageToTotalMonths } from '../lib/whoCalculations';
import SomaCharts from './SomaCharts';
import FcaForm from './FcaForm';
import RecallForm from './RecallForm';
import DietPlanComponent from './DietPlan';
import {
  ArrowLeft,
  Calendar,
  Baby,
  Scale,
  Ruler,
  TrendingUp,
  Flame,
  Apple,
  ClipboardList,
  FileSpreadsheet,
  Plus,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
  FileText,
  Printer,
  Download
} from 'lucide-react';
import udeaLogo from '@/assets/images/Logo-udea.png';

interface PatientDetailsProps {
  patient: Patient;
  onBack: () => void;
  onUpdatePatient: (updated: Patient) => void;
}

type TabType = 'antropometria' | 'requerimientos' | 'fca' | 'recordatorio' | 'plan';

export default function PatientDetails({ patient, onBack, onUpdatePatient }: PatientDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('antropometria');
  const [showAddEvalModal, setShowAddEvalModal] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfNotes, setPdfNotes] = useState('');
  
  // New Evaluation Form State
  const [peso, setPeso] = useState('');
  const [talla, setTalla] = useState('');
  const [medicionTipo, setMedicionTipo] = useState<'acostado' | 'parado'>('acostado');
  const [pliegueSubescapular, setPliegueSubescapular] = useState('');
  const [pliegueTricipital, setPliegueTricipital] = useState('');
  const [perimetroBrazo, setPerimetroBrazo] = useState('');
  const [perimetroCefalico, setPerimetroCefalico] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [activeEvalForCharts, setActiveEvalForCharts] = useState<Evaluation | null>(() => {
    if (patient.evaluaciones && patient.evaluaciones.length > 0) {
      return patient.evaluaciones[patient.evaluaciones.length - 1]; // Default to latest
    }
    return null;
  });

  const age = calculateChronologicalAge(patient.fechaNacimiento);
  const totalMonths = ageToTotalMonths(age);
  const isMale = patient.genero === 'niño';

  React.useEffect(() => {
    if (showAddEvalModal) {
      if (totalMonths < 24) {
        setMedicionTipo('acostado');
      } else {
        setMedicionTipo('parado');
      }
    }
  }, [showAddEvalModal, totalMonths]);

  const handleCreateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const w = parseFloat(peso);
    const h = parseFloat(talla);
    const pc = parseFloat(perimetroCefalico);
    const pb = parseFloat(perimetroBrazo);
    const ps = parseFloat(pliegueSubescapular) || 0;
    const pt = parseFloat(pliegueTricipital) || 0;

    if (isNaN(w) || w <= 0) {
      setError('Por favor ingrese un peso válido.');
      return;
    }
    if (isNaN(h) || h <= 0) {
      setError('Por favor ingrese una talla válida.');
      return;
    }
    if (isNaN(pc) || pc <= 0) {
      setError('Por favor ingrese un perímetro cefálico válido.');
      return;
    }
    if (isNaN(pb) || pb <= 0) {
      setError('Por favor ingrese un perímetro de brazo válido.');
      return;
    }

    setLoading(true);

    try {
      // 1. Perform clinical calculations on client-side dynamically using WHO parameters
      const evalData = await calculateEvaluation(
        patient.fechaNacimiento,
        patient.genero,
        w,
        h,
        pc,
        pb,
        medicionTipo
      );

      // Append additional fields
      const completeEval: Evaluation = {
        ...evalData,
        id: `eval_${Date.now()}`,
        fecha: new Date().toISOString(),
        pliegueSubescapular: ps,
        pliegueTricipital: pt
      };

      // 2. Save inside the patient's record on server
      const updatedPatient: Patient = {
        ...patient,
        evaluaciones: [...patient.evaluaciones, completeEval]
      };

      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPatient)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la evaluación');
      }

      onUpdatePatient(data);
      setActiveEvalForCharts(completeEval);
      setShowAddEvalModal(false);
      // Reset form fields
      setPeso('');
      setTalla('');
      setPliegueSubescapular('');
      setPliegueTricipital('');
      setPerimetroBrazo('');
      setPerimetroCefalico('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvaluation = async (evalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Está seguro de eliminar esta evaluación?')) return;

    try {
      const updatedEvals = patient.evaluaciones.filter(ev => ev.id !== evalId);
      const updatedPatient: Patient = {
        ...patient,
        evaluaciones: updatedEvals
      };

      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPatient)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar los cambios');
      }

      onUpdatePatient(data);
      if (activeEvalForCharts?.id === evalId) {
        setActiveEvalForCharts(updatedEvals.length > 0 ? updatedEvals[updatedEvals.length - 1] : null);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const renderPdfPreviewModal = () => {
    if (!showPdfPreview || !activeEvalForCharts) return null;

    const storedUser = localStorage.getItem('soma_user');
    const loggedUser = storedUser ? JSON.parse(storedUser) : null;
    const currentDateStr = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const isMale = patient.genero === 'niño';

    const getPdfClinicalAdvice = (type: 'pesoTalla' | 'tallaEdad' | 'perimetroCefalico', classification: string, z: number) => {
      if (type === 'pesoTalla') {
        if (z > 2) {
          return 'El paciente se encuentra en rango de sobrepeso u obesidad para su estatura. Se recomienda revisar el consumo calórico diario, priorizar el peso ideal para la planificación dietética, evitar alimentos ultraprocesados y grasas saturadas, y aumentar la actividad física activa diaria.';
        } else if (z > 1) {
          return 'El paciente presenta riesgo de sobrepeso. Se aconseja monitorear las porciones de carbohidratos simples y grasas en el FCA y fomentar hábitos saludables de alimentación complementaria o familiar.';
        } else if (z < -2) {
          return '¡Alerta clínica! El paciente presenta desnutrición aguda moderada o severa. Requiere seguimiento médico/nutricional prioritario. Se aconseja iniciar pauta de recuperación nutricional y evaluar la ingesta calórica y la frecuencia de tomas/comidas.';
        } else if (z < -1) {
          return 'El paciente presenta riesgo de desnutrición aguda. Es importante revisar la ingesta energética diaria, la aceptación de alimentos sólidos y la presencia de episodios infecciosos recientes.';
        } else {
          return 'Relación peso/talla adecuada. El desarrollo ponderal se encuentra dentro del rango de normalidad de la OMS. Se aconseja mantener el plan de alimentación actual y las visitas de control de crecimiento.';
        }
      } else if (type === 'tallaEdad') {
        if (z < -2) {
          return '¡Alerta clínica! El paciente presenta talla baja o retraso en el crecimiento lineal. Se aconseja evaluar deficiencias de micronutrientes (como zinc o hierro), investigar causas secundarias y fortificar la alimentación.';
        } else if (z < -1) {
          return 'El paciente presenta riesgo de talla baja. Se recomienda vigilar la velocidad de crecimiento, asegurar una ingesta de proteínas de alto valor biológico y micronutrientes esenciales, y repetir la medición en el próximo control.';
        } else {
          return 'Crecimiento en talla adecuado para la edad. El desarrollo lineal del paciente se encuentra dentro de los parámetros esperados de la OMS.';
        }
      } else {
        if (z > 2) {
          return 'El perímetro cefálico está por encima de la media (+2 SD), lo que puede representar macrocefalia. Se sugiere valoración por pediatría para descartar anomalías estructurales o variantes familiares.';
        } else if (z < -2) {
          return 'El perímetro cefálico se encuentra por debajo de la media (-2 SD), lo que puede indicar microcefalia o restricción del desarrollo craneal. Se sugiere remitir a valoración pediátrica especializada y estimulación oportuna.';
        } else {
          return 'Perímetro cefálico normal. El desarrollo craneal y del sistema nervioso se encuentra dentro de los rangos esperados de la OMS.';
        }
      }
    };

    const printStyles = `
      @media print {
        /* Hide all page content except the print modal area */
        aside, nav, header, #patient_tab_bar, #patient_header_card, #btn_back_patients, #antropometria_panel, .no-print, #global_header, #mobile_navbar {
          display: none !important;
        }

        /* Reset body scroll and height */
        body, html, #root, #root > div, #root > div > div, main#soma_body, #patient_details_panel, #soma_app {
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
          position: static !important;
        }

        /* Reset outer modal position and layout */
        #soma-pdf-modal-wrapper {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          background: transparent !important;
          backdrop-filter: none !important;
          padding: 0 !important;
          margin: 0 !important;
          display: block !important;
          z-index: auto !important;
          border: none !important;
        }

        /* Reset the modal container to print infinite height */
        #soma-pdf-modal-content {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          max-width: none !important;
          width: 100% !important;
          max-height: none !important;
          height: auto !important;
          overflow: visible !important;
          position: static !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .soma-pdf-preview-body-wrapper {
          background: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
          overflow: visible !important;
          display: block !important;
          width: 100% !important;
        }

        #soma-pdf-print-area {
          display: block !important;
          width: 21cm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          border: none !important;
        }

        /* Printable A4 Page sheets */
        .page-sheet {
          border: none !important;
          box-shadow: none !important;
          margin: 0 !important;
          padding: 1.2cm !important;
          width: 21cm !important;
          min-height: 29.7cm !important;
          background: white !important;
          color: black !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          page-break-after: always !important;
          page-break-inside: avoid !important;
        }

        .page-sheet:last-child {
          page-break-after: avoid !important;
        }
      }
    `;

    return (
      <div 
        id="soma-pdf-modal-wrapper"
        onClick={() => setShowPdfPreview(false)}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <style dangerouslySetInnerHTML={{ __html: printStyles }} />
        <div 
          id="soma-pdf-modal-content"
          className="bg-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[96vh] overflow-y-auto border border-slate-700 flex flex-col animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Toolbar (Controls) */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700 bg-slate-850 no-print">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-400" /> Vista Previa del Reporte PDF (2 Páginas)
              </h3>
              <p className="text-[11px] text-slate-400">Simulación del documento A4. Puedes escribir notas específicas en la Página 2 antes de descargar o imprimir.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-all cursor-pointer shadow-md shadow-emerald-900/30 border-none"
                title="Guarda este reporte en formato PDF"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Descargar PDF</span>
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-all cursor-pointer shadow-md shadow-blue-900/30 border-none"
                title="Imprime este reporte en papel o PDF"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Imprimir Reporte</span>
              </button>
              <button 
                onClick={() => setShowPdfPreview(false)}
                className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-350 hover:text-white rounded-full transition-all cursor-pointer border-none"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Modal Preview Body (Displays pages vertically) */}
          <div className="p-6 bg-slate-750 overflow-y-auto flex flex-col items-center space-y-6 soma-pdf-preview-body-wrapper">
            
            <div id="soma-pdf-print-area" className="flex flex-col space-y-6 items-center w-full">
              
              {/* PAGE 1 */}
              <div className="bg-white shadow-2xl w-full max-w-[21cm] min-h-[29.7cm] p-10 border border-slate-100 text-slate-800 flex flex-col justify-between font-sans leading-normal page-sheet">
                <div>
                  {/* Header (UdeA Logo & Title) */}
                  <div className="flex justify-between items-start border-b-2 border-emerald-800 pb-3">
                    <div className="flex items-center space-x-3">
                      <img src={udeaLogo} alt="Universidad de Antioquia" className="h-20 w-auto shrink-0 object-contain" />
                      <div className="text-left">
                        <h1 className="text-sm font-extrabold text-emerald-800 leading-tight uppercase tracking-wider">
                          Universidad de Antioquia
                        </h1>
                        <h2 className="text-[11px] font-bold text-slate-600 leading-none uppercase">
                          Nutrición y Dietética
                        </h2>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">
                          SOMA - Sistema de Nutrición Infantil
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-700">REPORTE NUTRICIONAL</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 font-mono">{currentDateStr}</p>
                      <p className="text-[9px] text-slate-400 font-mono leading-none">Medellín, Antioquia</p>
                    </div>
                  </div>

                  {/* Professional & Patient Info Section */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-3 text-left">
                      <h3 className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide border-b border-emerald-100 pb-1 mb-1.5">
                        Estudiante de Nutrición Responsable
                      </h3>
                      <p className="text-xs font-bold text-slate-800">
                        {loggedUser ? `${loggedUser.nombre} ${loggedUser.apellidos}` : 'Natalia Hernández'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono leading-tight mt-1">
                        Correo: {loggedUser?.correo || 'correo@udea.edu.co'}
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-left">
                      <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-1 mb-1.5">
                        Datos del Paciente
                      </h3>
                      <p className="text-xs font-bold text-slate-800 uppercase">
                        {patient.nombre}
                      </p>
                      {patient.documento && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Documento: <span className="font-semibold">{patient.documento}</span>
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Género: <span className="font-semibold">{isMale ? 'Masculino' : 'Femenino'}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono leading-tight">
                        F. Nacimiento: {patient.fechaNacimiento}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Edad al evaluar: <span className="font-semibold text-slate-700">{age.years}a {age.months}m {age.days}d</span>
                      </p>
                      {patient.nombreAcudiente && (
                        <div className="text-[9px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-200/60 leading-tight">
                          <span className="font-bold text-slate-600 block uppercase tracking-wider text-[8px]">Acudiente</span>
                          <span>{patient.nombreAcudiente} {patient.parentescoAcudiente ? `(${patient.parentescoAcudiente})` : ''}</span>
                          {patient.celularAcudiente && <span className="block">Tel: {patient.celularAcudiente}</span>}
                          {patient.direccionAcudiente && <span className="block">Dir: {patient.direccionAcudiente}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Measurements Section */}
                  <div className="mt-4 text-left">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-0.5 mb-1.5">
                      1. Mediciones Antropométricas Registradas
                    </h3>
                    <table className="w-full text-left text-[11px] font-sans border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[9px] font-bold">
                          <th className="py-1 px-2.5">Parámetro</th>
                          <th className="py-1 px-2.5 text-right">Valor</th>
                          <th className="py-1 px-2.5">Parámetro</th>
                          <th className="py-1 px-2.5 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr>
                          <td className="py-1 px-2.5 font-medium text-slate-500">Peso Corporal</td>
                          <td className="py-1 px-2.5 text-right font-mono font-bold text-slate-800">{activeEvalForCharts.peso} kg</td>
                          <td className="py-1 px-2.5 font-medium text-slate-500">Perímetro Cefálico</td>
                          <td className="py-1 px-2.5 text-right font-mono font-bold text-slate-800">{activeEvalForCharts.perimetroCefalico > 0 ? `${activeEvalForCharts.perimetroCefalico} cm` : 'No medido'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2.5 font-medium text-slate-500">Talla / Estatura</td>
                          <td className="py-1 px-2.5 text-right font-mono font-bold text-slate-800">{activeEvalForCharts.talla} cm</td>
                          <td className="py-1 px-2.5 font-medium text-slate-500">Perímetro de Brazo</td>
                          <td className="py-1 px-2.5 text-right font-mono font-bold text-slate-800">{activeEvalForCharts.perimetroBrazo > 0 ? `${activeEvalForCharts.perimetroBrazo} cm` : 'No medido'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2.5 font-medium text-slate-500">Pliegue Tricipital</td>
                          <td className="py-1 px-2.5 text-right font-mono font-bold text-slate-800">{activeEvalForCharts.pliegueTricipital > 0 ? `${activeEvalForCharts.pliegueTricipital} mm` : 'No medido'}</td>
                          <td className="py-1 px-2.5 font-medium text-slate-500">Pliegue Subescapular</td>
                          <td className="py-1 px-2.5 text-right font-mono font-bold text-slate-800">{activeEvalForCharts.pliegueSubescapular > 0 ? `${activeEvalForCharts.pliegueSubescapular} mm` : 'No medido'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* WHO Classification Section */}
                  <div className="mt-4 text-left">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-0.5 mb-1.5">
                      2. Clasificación del Estado Nutricional (Patrón de Crecimiento OMS)
                    </h3>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="border border-slate-200 rounded-xl p-2 text-center bg-slate-50/30">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Peso para la Talla</p>
                        <p className="text-[11px] font-bold text-slate-800 mt-1 uppercase leading-tight">{activeEvalForCharts.pesoTallaClass}</p>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Z = {activeEvalForCharts.pesoTallaZ?.toFixed(2)}</p>
                      </div>
                      <div className="border border-slate-200 rounded-xl p-2 text-center bg-slate-50/30">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Talla para la Edad</p>
                        <p className="text-[11px] font-bold text-slate-800 mt-1 uppercase leading-tight">{activeEvalForCharts.tallaEdadClass}</p>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Z = {activeEvalForCharts.tallaEdadZ?.toFixed(2)}</p>
                      </div>
                      <div className="border border-slate-200 rounded-xl p-2 text-center bg-slate-50/30">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Perímetro Cefálico</p>
                        <p className="text-[11px] font-bold text-slate-800 mt-1 uppercase leading-tight">{activeEvalForCharts.perimetroCefalicoClass}</p>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Z = {activeEvalForCharts.perimetroCefalicoZ?.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Caloric Requirements */}
                  <div className="mt-3 bg-blue-50/35 border border-blue-100 rounded-xl p-2.5 flex justify-between items-center text-left">
                    <div className="max-w-[75%]">
                      <h3 className="text-[10px] font-bold text-blue-900 uppercase tracking-wide">
                        3. Requerimientos Energéticos Estimados
                      </h3>
                      <p className="text-[10px] text-slate-655 leading-normal mt-0.5 font-sans">
                        Gasto Energético Diario calculado con base en su diagnóstico antropométrico actual, usando el <span className="font-semibold text-slate-700">{activeEvalForCharts.pesoUsadoParaFormula === 'actual' ? 'Peso Actual' : `Peso Ideal (${activeEvalForCharts.pesoIdealCalculado?.toFixed(2)} kg)`}</span> para prevenir desbalances.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] text-blue-800 font-bold uppercase tracking-wider leading-none">Calorías</p>
                      <p className="text-lg font-extrabold text-blue-900 mt-0.5 font-mono">{activeEvalForCharts.caloriasRecomendadas} <span className="text-[10px] font-medium">kcal</span></p>
                    </div>
                  </div>

                  {/* Growth Charts Preview */}
                  <div className="mt-4 border-t border-slate-200 pt-3">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
                      Curvas de Crecimiento del Paciente (Patrón de Referencia OMS)
                    </h3>
                    <div className="scale-[0.98] origin-top">
                      <SomaCharts patient={patient} evaluation={activeEvalForCharts} isPrintView={true} />
                    </div>
                  </div>

                  {/* General Medical Alert in red letters (no box, after charts) */}
                  {activeEvalForCharts.perimetroBrazo > 0 && activeEvalForCharts.perimetroBrazo < 11.5 && (
                    <div className="mt-4 text-left border-t border-red-100 pt-2">
                      <p className="text-[10px] font-extrabold text-red-600 uppercase tracking-wide leading-none">
                        ¡ALERTA MÉDICA GENERAL!
                      </p>
                      <p className="text-[10px] text-red-600 font-sans mt-1 leading-normal">
                        El paciente cuenta con un Perímetro de Brazo de <span className="font-bold">{activeEvalForCharts.perimetroBrazo} cm</span> (umbral crítico: menor a 11.5 cm), lo cual indica desnutrición aguda severa o riesgo inminente según el protocolo nacional clínico de la OMS. Se requiere intervención diagnóstica y terapéutica prioritaria.
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-center text-[9px] text-slate-400 mt-4 no-print border-t border-slate-100 pt-2">
                  Continúa en la Página 2
                </div>
              </div>

              {/* PAGE 2 */}
              <div className="bg-white shadow-2xl w-full max-w-[21cm] min-h-[29.7cm] p-10 border border-slate-100 text-slate-800 flex flex-col justify-between font-sans leading-normal page-sheet mt-6" style={{ pageBreakBefore: 'always' }}>
                <div className="flex-grow flex flex-col">
                  {/* Simplified continuation header */}
                  <div className="flex justify-between items-center border-b border-emerald-800 pb-2 mb-4">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Universidad de Antioquia • Nutrición y Dietética</span>
                    <span className="text-[9px] text-slate-500 font-mono">Paciente: {patient.nombre} (Pág. 2)</span>
                  </div>

                  {/* 7. Análisis e Interpretación de Curvas */}
                  <div className="text-left mt-2">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      4. Análisis e Interpretación de Curvas Clínicas (OMS)
                    </h3>
                    <div className="space-y-2">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                          Relación Peso para la Talla: <span className="text-slate-800 normal-case">{activeEvalForCharts.pesoTallaClass} (Z = {activeEvalForCharts.pesoTallaZ?.toFixed(2)})</span>
                        </p>
                        <p className="text-[9.5px] text-slate-655 mt-0.5 font-sans leading-normal">
                          {getPdfClinicalAdvice('pesoTalla', activeEvalForCharts.pesoTallaClass, activeEvalForCharts.pesoTallaZ || 0)}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                          Relación Talla para la Edad: <span className="text-slate-800 normal-case">{activeEvalForCharts.tallaEdadClass} (Z = {activeEvalForCharts.tallaEdadZ?.toFixed(2)})</span>
                        </p>
                        <p className="text-[9.5px] text-slate-655 mt-0.5 font-sans leading-normal">
                          {getPdfClinicalAdvice('tallaEdad', activeEvalForCharts.tallaEdadClass, activeEvalForCharts.tallaEdadZ || 0)}
                        </p>
                      </div>

                      {activeEvalForCharts.perimetroCefalico > 0 && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                            Perímetro Cefálico para la Edad: <span className="text-slate-800 normal-case">{activeEvalForCharts.perimetroCefalicoClass} (Z = {activeEvalForCharts.perimetroCefalicoZ?.toFixed(2)})</span>
                          </p>
                          <p className="text-[9.5px] text-slate-655 mt-0.5 font-sans leading-normal">
                            {getPdfClinicalAdvice('perimetroCefalico', activeEvalForCharts.perimetroCefalicoClass, activeEvalForCharts.perimetroCefalicoZ || 0)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 8. Interactive Nutritionist custom notes */}
                  <div className="mt-6 text-left flex-grow flex flex-col">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      5. Notas y Observaciones Clínicas Adicionales
                    </h3>
                    <textarea
                      value={pdfNotes}
                      onChange={(e) => setPdfNotes(e.target.value)}
                      placeholder="Escriba aquí sus observaciones clínicas, recomendaciones específicas de alimentación, o plan alimentario personalizado antes de imprimir..."
                      className="w-full flex-grow p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/30 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600 font-sans resize-none placeholder-slate-400 no-print min-h-[180px]"
                    />
                    {/* Printable view (replaces textarea during print) */}
                    <div className="hidden print:block whitespace-pre-wrap text-xs text-slate-700 min-h-[6cm] p-4 border border-dashed border-slate-350 rounded-xl bg-slate-50/10 font-sans leading-relaxed text-left flex-grow">
                      {pdfNotes || '\n\n\n\n\n\n\n\n'}
                    </div>
                  </div>
                </div>

                {/* Footer Signatures on Page 2 */}
                <div className="mt-8 pt-4 border-t border-slate-200 flex justify-around items-end text-center text-[9px] text-slate-500">
                  <div className="w-5/12">
                    <div className="h-7 border-b border-slate-300 mb-1.5"></div>
                    <p className="font-bold text-slate-700">Firma de Estudiante de Nutrición Responsable</p>
                    <p className="font-mono text-[8px]">UdeA Nutrición y Dietética</p>
                  </div>
                  <div className="w-5/12 flex items-center justify-center opacity-30">
                    <svg viewBox="0 0 100 100" className="h-10 w-10">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" />
                      <text x="50" y="55" fontSize="10" textAnchor="middle" fill="#64748b" fontWeight="bold" fontFamily="sans-serif">SELLO UdeA</text>
                    </svg>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="patient_details_panel">
      
      {/* 1. BACK HEADER */}
      <button
        onClick={onBack}
        id="btn_back_patients"
        className="inline-flex items-center space-x-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Volver a Directorio</span>
      </button>

      {/* 2. PATIENT MINI-PROFILE CARD */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm mb-8 relative overflow-hidden" id="patient_header_card">
        <div className={`absolute top-0 left-0 h-full w-2 ${isMale ? 'bg-blue-400' : 'bg-pink-400'}`} />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shrink-0 ${isMale ? 'bg-blue-500 shadow-blue-100' : 'bg-pink-500 shadow-pink-100'} shadow-lg`}>
              {patient.nombre.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">{patient.nombre}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isMale ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                  {patient.genero}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 font-sans">
                Fecha de Nacimiento: <strong className="text-slate-700">{new Date(patient.fechaNacimiento).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</strong>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Edad Cronológica Exacta: <strong className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{age.years} años, {age.months} meses y {age.days} días</strong> ({totalMonths} meses)
              </p>

              {/* Datos Adicionales (Documento y Acudiente) */}
              {(patient.documento || patient.nombreAcudiente) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 mt-4 pt-4 border-t border-slate-100/80 text-xs">
                  {patient.documento && (
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">No. Documento:</span>
                      <span className="text-slate-700 font-medium">{patient.documento}</span>
                    </div>
                  )}
                  {patient.nombreAcudiente && (
                    <>
                      <div>
                        <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Acudiente:</span>
                        <span className="text-slate-700 font-medium">
                          {patient.nombreAcudiente} {patient.parentescoAcudiente ? `(${patient.parentescoAcudiente})` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Contacto Acudiente:</span>
                        <span className="text-slate-700 font-medium">
                          {patient.celularAcudiente || 'Sin celular'}{patient.direccionAcudiente ? ` - ${patient.direccionAcudiente}` : ''}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowAddEvalModal(true)}
              id="btn_new_eval_trigger"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all text-sm space-x-2 cursor-pointer shadow-md shadow-blue-100"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Evaluación</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. TABS MENU */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 mb-8 pb-px gap-4" id="patient_tab_bar">
        <div className="flex overflow-x-auto scrollbar-none gap-2">
          {[
            { id: 'antropometria', label: 'Antropometría y Gráficos', icon: Scale },
            { id: 'requerimientos', label: 'Requerimientos Calóricos', icon: Flame },
            { id: 'fca', label: 'Frecuencia Alimentos (FCA)', icon: Apple },
            { id: 'recordatorio', label: 'Recordatorio 24H', icon: ClipboardList },
            { id: 'plan', label: 'Plan de Alimentación', icon: FileSpreadsheet }
          ].map(t => {
            const IconComponent = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50/10'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* PDF Preview Button */}
        {activeEvalForCharts && (
          <button
            onClick={() => setShowPdfPreview(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 mb-2 sm:mb-0 rounded-xl bg-slate-50 border border-slate-200 text-slate-655 font-semibold hover:bg-slate-105 hover:text-slate-800 transition-all text-xs cursor-pointer shadow-sm self-start sm:self-auto no-print"
          >
            <FileText className="h-3.5 w-3.5 text-red-500" />
            <span>Vista previa PDF</span>
          </button>
        )}
      </div>

      {/* 4. ACTIVE TAB PANELS */}

      {/* PANEL 1: ANTROPOMETRÍA Y GRÁFICOS */}
      {activeTab === 'antropometria' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8" id="antropometria_panel">
          
          {/* Left panel: list of evaluations */}
          <div className="xl:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-50 pb-2 flex justify-between items-center">
                <span>Historial de Mediciones</span>
                <span className="text-xs font-mono text-slate-400 font-normal">({patient.evaluaciones.length} eval)</span>
              </h3>

              {patient.evaluaciones.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-100 rounded-2xl text-slate-400">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium">Sin evaluaciones registradas</p>
                  <p className="text-[10px] mt-1">Pulsa en "Nueva Evaluación" para registrar datos</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1" id="eval_list_scroller">
                  {patient.evaluaciones.slice().reverse().map((ev) => {
                    const isActive = activeEvalForCharts?.id === ev.id;
                    return (
                      <div
                        key={ev.id}
                        onClick={() => setActiveEvalForCharts(ev)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                          isActive
                            ? 'border-blue-200 bg-blue-50/35 shadow-sm'
                            : 'border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            {new Date(ev.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block mt-1">
                            Peso: {ev.peso} kg | Talla: {ev.talla} cm {ev.medicionTipo ? `(${ev.medicionTipo})` : ''} | PC: {ev.perimetroCefalico} cm
                          </span>
                          {ev.tallaAjustada !== undefined && Math.abs(ev.tallaAjustada - ev.talla) > 0.01 && (
                            <span className="text-[9px] text-amber-600 block mt-0.5 font-medium">
                              Talla corregida OMS: {ev.tallaAjustada.toFixed(1)} cm
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                          <button
                            onClick={(e) => handleDeleteEvaluation(ev.id, e)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: dynamic charts for the active selected evaluation */}
          <div className="xl:col-span-8">
            {activeEvalForCharts ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <span className="text-xs text-slate-400">Evaluación visualizada:</span>
                    <h3 className="text-sm font-bold text-slate-800 mt-0.5">
                      {new Date(activeEvalForCharts.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-w-xl lg:justify-end">
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 border border-slate-100 text-[10px] font-mono text-slate-500 rounded-md">
                      Peso: {activeEvalForCharts.peso} kg
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 border border-slate-100 text-[10px] font-mono text-slate-500 rounded-md">
                      Talla: {activeEvalForCharts.talla} cm {activeEvalForCharts.medicionTipo ? `(${activeEvalForCharts.medicionTipo})` : ''}
                    </span>
                    {activeEvalForCharts.tallaAjustada !== undefined && Math.abs(activeEvalForCharts.tallaAjustada - activeEvalForCharts.talla) > 0.01 && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 border border-amber-100 text-[10px] font-mono text-amber-700 rounded-md font-semibold">
                        Ajuste OMS: {activeEvalForCharts.tallaAjustada.toFixed(1)} cm
                      </span>
                    )}
                    {activeEvalForCharts.perimetroBrazo > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 border border-slate-100 text-[10px] font-mono text-slate-500 rounded-md">
                        P. Brazo: {activeEvalForCharts.perimetroBrazo} cm
                      </span>
                    )}
                    {activeEvalForCharts.perimetroCefalico > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 border border-slate-100 text-[10px] font-mono text-slate-500 rounded-md">
                        P. Cefálico: {activeEvalForCharts.perimetroCefalico} cm
                      </span>
                    )}
                    {activeEvalForCharts.pliegueTricipital > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 border border-slate-100 text-[10px] font-mono text-slate-500 rounded-md">
                        Pl. Tricipital: {activeEvalForCharts.pliegueTricipital} mm
                      </span>
                    )}
                    {activeEvalForCharts.pliegueSubescapular > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 border border-slate-100 text-[10px] font-mono text-slate-500 rounded-md">
                        Pl. Subescapular: {activeEvalForCharts.pliegueSubescapular} mm
                      </span>
                    )}
                  </div>
                </div>

                {/* Plot curves using WHO values */}
                <SomaCharts patient={patient} evaluation={activeEvalForCharts} />
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400">
                <Scale className="h-16 w-16 mx-auto mb-4 text-slate-200 animate-bounce" />
                <h4 className="text-slate-600 font-semibold">Esperando primera evaluación...</h4>
                <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
                  Por favor, agregue una evaluación antropométrica usando el botón superior para graficar el estado nutricional del niño.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* PANEL 2: REQUERIMIENTOS CALÓRICOS (CLINICAL DETAILED FORMULAS) */}
      {activeTab === 'requerimientos' && (
        <div className="space-y-6" id="requerimientos_panel">
          {activeEvalForCharts ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center space-x-2 text-blue-600 border-b border-slate-100 pb-4">
                <Flame className="h-6 w-6" />
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Cálculo de Consumo de Calorías Diario (OMS)</h3>
                  <p className="text-xs text-slate-400">Prescripción de energía basada en género, edad y clasificación de peso</p>
                </div>
              </div>

              {/* Big requirement display */}
              <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-100/50 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Energía Recomendada Diaria:</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-3xl md:text-4xl font-black text-blue-600 font-mono tracking-tight">
                      {activeEvalForCharts.caloriasRecomendadas}
                    </span>
                    <span className="text-sm font-bold text-slate-500">kcal/día</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                  <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 uppercase block">Peso Utilizado:</span>
                    <span className="text-xs font-bold text-slate-700 capitalize">
                      {activeEvalForCharts.pesoUsadoParaFormula === 'actual' ? 'Peso Actual' : 'Peso Ideal'}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 uppercase block">Valor Peso:</span>
                    <span className="text-xs font-bold text-slate-700">
                      {activeEvalForCharts.pesoUsadoParaFormula === 'actual' 
                        ? `${activeEvalForCharts.peso} kg` 
                        : `${activeEvalForCharts.pesoIdealCalculado?.toFixed(2)} kg`
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Mathematical breakdown */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span>Criterio Clínico y Fórmulas Utilizadas:</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rule criteria */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">1. Criterio de Selección de Peso</span>
                    <p className="text-xs text-slate-500 leading-relaxed font-sans">
                      Según directrices nutricionales clínicas de la OMS para niños menores de 5 años:
                    </p>
                    <ul className="list-disc list-inside text-xs text-slate-500 space-y-1 font-sans">
                      <li>
                        Si tiene <strong className="text-slate-700">peso adecuado o déficit</strong> (riesgo desnutrición, desnutrición aguda), se usa el <strong className="text-blue-700 font-bold">Peso Actual ({activeEvalForCharts.peso} kg)</strong>.
                      </li>
                      <li>
                        Si tiene <strong className="text-slate-700">riesgo de sobrepeso, sobrepeso u obesidad</strong>, se usa el <strong className="text-blue-700 font-bold">Peso Ideal para la Talla ({activeEvalForCharts.pesoIdealCalculado?.toFixed(2)} kg)</strong> para no prescribir un exceso calórico nocivo.
                      </li>
                    </ul>
                    <div className="p-2 bg-blue-50 text-blue-800 text-[11px] font-medium rounded-lg mt-2 font-sans">
                      Diagnóstico: <strong className="uppercase">{activeEvalForCharts.pesoTallaClass}</strong>. Por lo tanto, el sistema aplicó el <strong className="uppercase font-bold">{activeEvalForCharts.pesoUsadoParaFormula}</strong>.
                    </div>
                  </div>

                  {/* Exact Formula Applied */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">2. Ecuación Fisiológica de Energía</span>
                    <p className="text-xs text-slate-500 leading-relaxed font-sans">
                      El sistema aplica estrictamente las fórmulas especificadas basadas en el género del niño:
                    </p>
                    <div className="p-3 bg-slate-800 text-slate-100 rounded-xl font-mono text-xs space-y-1">
                      <div>
                        Niños: <span className="text-blue-400">310.2 + (63.3 * P) - (0.263 * P²)</span>
                      </div>
                      <div>
                        Niñas: <span className="text-blue-400">263.4 + (65.3 * P) - (0.454 * P²)</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal font-sans">
                      Donde <strong className="text-slate-600">P</strong> representa el peso correspondiente en kilogramos seleccionado en el paso anterior.
                    </p>
                  </div>
                </div>

                {/* Validation process box */}
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/20 space-y-2">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Validación y Percentiles Oficiales</span>
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed font-sans">
                    El peso ideal para la talla (mediana de la OMS) es consultado directamente de las bases tabuladas del estándar de crecimiento de la OMS:
                  </p>
                  <ul className="list-disc list-inside text-xs text-blue-700 space-y-1 font-sans pl-2">
                    <li>Se cruza el género del niño con su rango etario (0-2 años o 2-5 años).</li>
                    <li>Se localiza su talla exacta (<strong className="text-blue-900">{activeEvalForCharts.talla} cm</strong>).</li>
                    <li>Se interpola linealmente el peso correspondiente a la mediana (percentil 50 o Z-Score = 0) para determinar el <strong className="text-blue-900">Peso Ideal ({activeEvalForCharts.pesoIdealCalculado?.toFixed(2)} kg)</strong> con precisión milimétrica.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400">
              <Flame className="h-16 w-16 mx-auto mb-4 text-slate-200" />
              <h4 className="text-slate-600 font-semibold">Esperando evaluaciones</h4>
              <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
                Realiza una evaluación antropométrica para calcular automáticamente los requerimientos calóricos exactos de este paciente.
              </p>
            </div>
          )}
        </div>
      )}

      {/* PANEL 3: FRECUENCIA ALIMENTOS (FCA) */}
      {activeTab === 'fca' && (
        <FcaForm patient={patient} onUpdatePatient={onUpdatePatient} />
      )}

      {/* PANEL 4: RECORDATORIO 24H */}
      {activeTab === 'recordatorio' && (
        <RecallForm patient={patient} onUpdatePatient={onUpdatePatient} />
      )}

      {/* PANEL 5: PLAN ALIMENTACIÓN */}
      {activeTab === 'plan' && (
        <DietPlanComponent patient={patient} onUpdatePatient={onUpdatePatient} />
      )}


      {/* NUEVA EVALUACIÓN MODAL */}
      {showAddEvalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="add_eval_modal">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-transform">
            
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-blue-600">
                <Scale className="h-6 w-6" />
                <h2 className="text-lg font-bold text-slate-800">Agregar Evaluación Antropométrica</h2>
              </div>
              <button
                onClick={() => setShowAddEvalModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleCreateEvaluation} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs">
                  <strong>Error:</strong> {error}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                {/* Peso */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    id="eval_peso"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    placeholder="Ej. 12.5"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Talla */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Talla (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    id="eval_talla"
                    value={talla}
                    onChange={(e) => setTalla(e.target.value)}
                    placeholder="Ej. 88.4"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Posición de Medida (WHO Anthro) */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Medición
                  </label>
                  <select
                    id="eval_medicion_tipo"
                    value={medicionTipo}
                    onChange={(e) => setMedicionTipo(e.target.value as 'acostado' | 'parado')}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                  >
                    <option value="acostado">Acostado (Longitud)</option>
                    <option value="parado">Parado (Estatura)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Perímetro braquial */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Perímetro de Brazo (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    id="eval_perimetro_brazo"
                    value={perimetroBrazo}
                    onChange={(e) => setPerimetroBrazo(e.target.value)}
                    placeholder="Ej. 14.5"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Perímetro cefálico */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Perímetro Cefálico (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    id="eval_perimetro_cefalico"
                    value={perimetroCefalico}
                    onChange={(e) => setPerimetroCefalico(e.target.value)}
                    placeholder="Ej. 47.5"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-3">
                {/* Pliegue Tricipital */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Pliegue Tricipital (mm) (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={pliegueTricipital}
                    onChange={(e) => setPliegueTricipital(e.target.value)}
                    placeholder="Ej. 8.0"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Pliegue Subescapular */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Pliegue Subescapular (mm) (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={pliegueSubescapular}
                    onChange={(e) => setPliegueSubescapular(e.target.value)}
                    placeholder="Ej. 6.5"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-sm text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddEvalModal(false)}
                  className="w-1/2 py-2.5 px-4 border border-slate-200 rounded-xl text-slate-500 font-medium hover:bg-slate-50 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  id="btn_submit_eval"
                  className="w-1/2 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all text-sm flex justify-center items-center space-x-2 cursor-pointer shadow-md shadow-blue-100"
                >
                  {loading ? 'Calculando...' : 'Evaluar y Graficar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF PREVIEW MODAL */}
      {renderPdfPreviewModal()}

    </div>
  );
}

// Inline helper close icon
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
