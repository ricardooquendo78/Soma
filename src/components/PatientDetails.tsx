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
  Info
} from 'lucide-react';

interface PatientDetailsProps {
  patient: Patient;
  onBack: () => void;
  onUpdatePatient: (updated: Patient) => void;
}

type TabType = 'antropometria' | 'requerimientos' | 'fca' | 'recordatorio' | 'plan';

export default function PatientDetails({ patient, onBack, onUpdatePatient }: PatientDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('antropometria');
  const [showAddEvalModal, setShowAddEvalModal] = useState(false);
  
  // New Evaluation Form State
  const [peso, setPeso] = useState('');
  const [talla, setTalla] = useState('');
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
      const evalData = calculateEvaluation(
        patient.fechaNacimiento,
        patient.genero,
        w,
        h,
        pc,
        pb
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
      <div className="flex overflow-x-auto border-b border-slate-100 mb-8 pb-px scrollbar-none gap-2" id="patient_tab_bar">
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
                            Peso: {ev.peso} kg | Talla: {ev.talla} cm | PC: {ev.perimetroCefalico} cm
                          </span>
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
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-400">Evaluación visualizada:</span>
                    <h3 className="text-sm font-bold text-slate-800 mt-0.5">
                      {new Date(activeEvalForCharts.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 bg-slate-50 border border-slate-100 text-[11px] font-mono text-slate-600 rounded-lg">
                      Pliegue Tricipital: {activeEvalForCharts.pliegueTricipital} mm
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 bg-slate-50 border border-slate-100 text-[11px] font-mono text-slate-600 rounded-lg">
                      Pliegue Subescapular: {activeEvalForCharts.pliegueSubescapular} mm
                    </span>
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

              <div className="grid grid-cols-2 gap-4">
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
