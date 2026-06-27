import React, { useState, useEffect } from 'react';
import { Patient, DietPlan } from '../types';
import { Save, Flame, CheckCircle2, Sliders, ListTodo, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface MealPlanItem {
  nombre: string;
  descripcion: string;
}

interface DietPlanProps {
  patient: Patient;
  onUpdatePatient: (updated: Patient) => void;
}

const DEFAULT_MEALS = [
  { nombre: 'Desayuno (8:00 AM)', descripcion: '' },
  { nombre: 'Media Mañana (10:30 AM)', descripcion: '' },
  { nombre: 'Almuerzo (12:30 PM)', descripcion: '' },
  { nombre: 'Media Tarde (4:00 PM)', descripcion: '' },
  { nombre: 'Cena (7:00 PM)', descripcion: '' }
];

export default function DietPlanComponent({ patient, onUpdatePatient }: DietPlanProps) {
  const latestEval = patient.evaluaciones[patient.evaluaciones.length - 1];
  const defaultCalories = latestEval ? Math.round(latestEval.caloriasRecomendadas) : 1000;

  // Retrieve existing active diet plan or start fresh
  const [activePlan, setActivePlan] = useState<DietPlan | null>(() => {
    if (patient.planesAlimentacion && patient.planesAlimentacion.length > 0) {
      return patient.planesAlimentacion[0];
    }
    return null;
  });

  const [calories, setCalories] = useState(defaultCalories);
  const [carbsPct, setCarbsPct] = useState(50);
  const [protPct, setProtPct] = useState(15);
  const [fatPct, setFatPct] = useState(35);

  const [meals, setMeals] = useState<MealPlanItem[]>(() => DEFAULT_MEALS);
  const [indicacionesGenerales, setIndicacionesGenerales] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Update states if activePlan is loaded
  useEffect(() => {
    if (activePlan) {
      setCalories(activePlan.distribucionMacronutrientes.totalCalorias);
      setCarbsPct(activePlan.distribucionMacronutrientes.carbohidratosPorcentaje);
      setProtPct(activePlan.distribucionMacronutrientes.proteinasPorcentaje);
      setFatPct(activePlan.distribucionMacronutrientes.grasasPorcentaje);
      setMeals(activePlan.comidas);
      setIndicacionesGenerales(activePlan.indicacionesGenerales || '');
    }
  }, [activePlan]);

  // Compute Grams dynamically
  const carbsGrams = parseFloat(((calories * (carbsPct / 100)) / 4).toFixed(1));
  const protGrams = parseFloat(((calories * (protPct / 100)) / 4).toFixed(1));
  const fatGrams = parseFloat(((calories * (fatPct / 100)) / 9).toFixed(1));

  const pctSum = carbsPct + protPct + fatPct;
  const isPctValid = pctSum === 100;

  const handleMealChange = (index: number, description: string) => {
    const updated = [...meals];
    updated[index] = { ...updated[index], descripcion: description };
    setMeals(updated);
  };

  const handleSave = async () => {
    setError('');
    setSuccess(false);

    if (!isPctValid) {
      setError('La suma de los porcentajes de macronutrientes debe ser exactamente 100%.');
      return;
    }

    setLoading(true);

    try {
      const preparedPlan: DietPlan = {
        id: activePlan?.id || `plan_${Date.now()}`,
        fecha: new Date().toISOString(),
        distribucionMacronutrientes: {
          carbohidratosPorcentaje: carbsPct,
          proteinasPorcentaje: protPct,
          grasasPorcentaje: fatPct,
          carbohidratosGramos: carbsGrams,
          proteinasGramos: protGrams,
          grasasGramos: fatGrams,
          totalCalorias: calories
        },
        comidas: meals,
        indicacionesGenerales
      };

      const updatedPatient: Patient = {
        ...patient,
        planesAlimentacion: [preparedPlan] // Keep latest active plan in list
      };

      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPatient)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar el plan de alimentación');
      }

      onUpdatePatient(data);
      setActivePlan(preparedPlan);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6" id="diet_plan_panel">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 gap-3">
        <div className="flex items-center space-x-2 text-blue-600">
          <FileSpreadsheet className="h-6 w-6" />
          <div>
            <h3 className="text-lg font-bold text-slate-800">Plan de Alimentación y Menú Dietoterápico</h3>
            <p className="text-xs text-slate-400 mt-0.5">Diseña la distribución dietética según requerimientos calóricos</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading || !isPctValid}
          id="btn_save_diet"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all text-sm space-x-2 cursor-pointer shadow-md shadow-blue-100"
        >
          <Save className="h-4 w-4" />
          <span>{loading ? 'Guardando...' : 'Guardar Plan'}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
          <span>¡Plan de alimentación estructurado y guardado con éxito!</span>
        </div>
      )}

      {/* Grid with Macromonutrientes and Meal Planner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: MACRONUTRIENTES SLIDERS / CARD */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-50 rounded-2xl border border-slate-100/80 p-5 space-y-4">
            <div className="flex items-center space-x-2 text-slate-700">
              <Sliders className="h-5 w-5 text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Macronutrientes</h4>
            </div>

            {/* Calories input target */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Calorías Objetivo Diarias (kcal)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(Math.max(100, parseInt(e.target.value) || 0))}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm text-slate-800 font-mono font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <Flame className="h-4 w-4 text-amber-500" />
                </span>
              </div>
              {latestEval && (
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Sugerido por última evaluación: <strong>{Math.round(latestEval.caloriasRecomendadas)} kcal</strong>
                </span>
              )}
            </div>

            {/* Distribution Controls */}
            <div className="space-y-4 pt-2">
              {/* Carbs */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1 font-sans">
                  <span>Carbohidratos (4 kcal/g)</span>
                  <span className="font-semibold text-slate-800">{carbsPct}% ({carbsGrams}g)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={carbsPct}
                  onChange={(e) => setCarbsPct(parseInt(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Protein */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1 font-sans">
                  <span>Proteínas (4 kcal/g)</span>
                  <span className="font-semibold text-slate-800">{protPct}% ({protGrams}g)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={protPct}
                  onChange={(e) => setProtPct(parseInt(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Fat */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1 font-sans">
                  <span>Grasas (9 kcal/g)</span>
                  <span className="font-semibold text-slate-800">{fatPct}% ({fatGrams}g)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={fatPct}
                  onChange={(e) => setFatPct(parseInt(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Pct validation display */}
            <div className={`p-3 rounded-xl text-center text-xs font-semibold border ${
              isPctValid 
                ? 'bg-blue-50 border-blue-100 text-blue-800' 
                : 'bg-red-50 border-red-100 text-red-700 animate-pulse'
            }`}>
              {isPctValid ? (
                <span>✓ Suma de porcentajes es 100%</span>
              ) : (
                <span>⚠️ Distribución incorrecta: la suma es {pctSum}% (debe ser 100%)</span>
              )}
            </div>

          </div>

          {/* General Indications Text area */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Indicaciones y Recomendaciones Clínicas
            </label>
            <textarea
              rows={4}
              value={indicacionesGenerales}
              onChange={(e) => setIndicacionesGenerales(e.target.value)}
              placeholder="Ej. Evitar adición de sal y azúcar libre. Ofrecer agua pura entre comidas. Texturas trituradas o sólidas según capacidad masticatoria..."
              className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: MEALS BUILDER */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center space-x-2 text-slate-700 border-b border-slate-50 pb-2 mb-4">
            <ListTodo className="h-5 w-5 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Menú Estructurado Diario</h4>
          </div>

          <div className="space-y-4" id="diet_meals_inputs">
            {meals.map((m, index) => (
              <div key={m.nombre} className="border border-slate-100 rounded-2xl p-4 space-y-2 bg-slate-50/20">
                <label className="block text-xs font-bold text-slate-700">
                  {m.nombre}
                </label>
                <textarea
                  rows={2}
                  value={m.descripcion}
                  onChange={(e) => handleMealChange(index, e.target.value)}
                  placeholder="Ej. Papilla de fruta triturada o 1 huevo revuelto sin aceite..."
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                />
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="pt-6 border-t border-slate-50 flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading || !isPctValid}
          className="inline-flex items-center px-6 py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-900 transition-all text-sm space-x-2 cursor-pointer shadow-sm"
        >
          <Save className="h-4 w-4" />
          <span>{loading ? 'Guardando...' : 'Guardar y Generar Plan'}</span>
        </button>
      </div>

    </div>
  );
}
