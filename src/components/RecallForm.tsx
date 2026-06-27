import React, { useState } from 'react';
import { Patient, Recall24H, RecallMeal } from '../types';
import { Save, ClipboardList, CheckCircle2, Plus, Calendar, Trash2, BookOpen } from 'lucide-react';

interface RecallFormProps {
  patient: Patient;
  onUpdatePatient: (updated: Patient) => void;
}

const DEFAULT_MEALS = [
  'Desayuno',
  'Media Mañana',
  'Almuerzo',
  'Media Tarde',
  'Cena',
  'Colación Nocturna'
];

export default function RecallForm({ patient, onUpdatePatient }: RecallFormProps) {
  const [recalls, setRecalls] = useState<Recall24H[]>(patient.recordatorios || []);
  const [activeRecall, setActiveRecall] = useState<Recall24H | null>(null); // null means showing list
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form State for creating/editing a recall sheet
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [meals, setMeals] = useState<RecallMeal[]>(() => 
    DEFAULT_MEALS.map(m => ({
      comida: m,
      descripcion: '',
      ingredientes: '',
      medidaCasera: '',
      gramos: 0
    }))
  );

  const startNewRecall = () => {
    setFecha(new Date().toISOString().split('T')[0]);
    setObservacionesGenerales('');
    setMeals(DEFAULT_MEALS.map(m => ({
      comida: m,
      descripcion: '',
      ingredientes: '',
      medidaCasera: '',
      gramos: 0
    })));
    setActiveRecall({
      id: `new_rec_${Date.now()}`,
      fecha: new Date().toISOString(),
      comidas: [],
      observacionesGenerales: ''
    });
  };

  const loadRecallForEditing = (recall: Recall24H) => {
    setFecha(new Date(recall.fecha).toISOString().split('T')[0]);
    setObservacionesGenerales(recall.observacionesGenerales || '');
    
    // Merge existing meals with standard categories to ensure all are shown
    const merged = DEFAULT_MEALS.map(category => {
      const existing = recall.comidas.find(c => c.comida.toLowerCase() === category.toLowerCase());
      return existing || {
        comida: category,
        descripcion: '',
        ingredientes: '',
        medidaCasera: '',
        gramos: 0
      };
    });
    setMeals(merged);
    setActiveRecall(recall);
  };

  const handleMealFieldChange = (index: number, field: keyof RecallMeal, value: any) => {
    const updated = [...meals];
    updated[index] = { ...updated[index], [field]: value };
    setMeals(updated);
  };

  const saveRecall = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!activeRecall) return;

      const preparedRecall: Recall24H = {
        id: activeRecall.id,
        fecha: new Date(fecha + 'T12:00:00Z').toISOString(),
        comidas: meals.filter(m => m.descripcion || m.ingredientes || m.gramos > 0), // Filter out empty meals if any
        observacionesGenerales
      };

      // Filter out existing and append new
      let updatedRecalls = recalls.filter(r => r.id !== activeRecall.id);
      updatedRecalls = [preparedRecall, ...updatedRecalls]; // newest first

      const updatedPatient: Patient = {
        ...patient,
        recordatorios: updatedRecalls
      };

      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPatient)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar el recordatorio');
      }

      onUpdatePatient(data);
      setRecalls(data.recordatorios || []);
      setSuccess('Recordatorio de 24 Horas guardado con éxito!');
      setTimeout(() => {
        setSuccess('');
        setActiveRecall(null);
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteRecall = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Está seguro de eliminar este recordatorio?')) return;

    try {
      const updatedRecalls = recalls.filter(r => r.id !== id);
      const updatedPatient: Patient = {
        ...patient,
        recordatorios: updatedRecalls
      };

      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPatient)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar el recordatorio');
      }

      onUpdatePatient(data);
      setRecalls(data.recordatorios || []);
      setSuccess('Recordatorio eliminado.');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm" id="recall_panel">
      
      {/* 1. LIST VIEW OF HISTORICAL RECALLS */}
      {!activeRecall ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 gap-3">
            <div className="flex items-center space-x-2 text-blue-600">
              <ClipboardList className="h-6 w-6" />
              <div>
                <h3 className="text-lg font-bold text-slate-800">Recordatorios de 24 Horas</h3>
                <p className="text-xs text-slate-400 mt-0.5">Historial de ingestas diarias referidas por los acudientes</p>
              </div>
            </div>

            <button
              onClick={startNewRecall}
              id="btn_add_recall"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all text-sm space-x-2 cursor-pointer shadow-md shadow-blue-100 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>+ Nuevo Recordatorio</span>
            </button>
          </div>

          {success && (
            <div className="bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-xl text-xs">
              {success}
            </div>
          )}

          {recalls.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
              <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3 animate-pulse" />
              <p className="text-slate-500 font-medium text-sm">No hay recordatorios de 24h registrados</p>
              <p className="text-slate-400 text-xs mt-1">Registra la ingesta del día anterior pulsando el botón superior</p>
            </div>
          ) : (
            <div className="space-y-4" id="recalls_history_list">
              {recalls.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => loadRecallForEditing(rec)}
                  className="p-5 rounded-2xl border border-slate-100 hover:border-blue-100 hover:shadow-sm transition-all flex justify-between items-center cursor-pointer group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Recordatorio del {new Date(rec.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1 max-w-lg">
                        {rec.observacionesGenerales || 'Sin observaciones generales.'}
                      </p>
                      <div className="flex gap-1.5 mt-2">
                        {rec.comidas.map((c, i) => (
                          <span key={i} className="inline-block px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-600 rounded text-[10px] font-medium">
                            {c.comida}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => deleteRecall(rec.id, e)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Eliminar registro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 2. FORM VIEW TO CREATE/EDIT RECALL */
        <form onSubmit={saveRecall} className="space-y-6" id="recall_edit_form">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {activeRecall.id.startsWith('new_') ? 'Registrar Recordatorio' : 'Editar Recordatorio'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Ingresa de manera secuencial los alimentos consumidos ayer</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setActiveRecall(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 font-medium hover:bg-slate-50 transition-all text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all text-xs space-x-2 cursor-pointer shadow-sm shadow-blue-100"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Guardando...' : 'Guardar Recordatorio'}</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl text-xs">
              {error}
            </div>
          )}

          {/* Form Header info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Fecha de Consumo Referida
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-800 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Observaciones Generales / Hábitos
              </label>
              <input
                type="text"
                value={observacionesGenerales}
                onChange={(e) => setObservacionesGenerales(e.target.value)}
                placeholder="Ej. Come solo, buen apetito, rechaza lácteos hoy..."
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-800 transition-all"
              />
            </div>
          </div>

          {/* Meals Sub-Forms */}
          <div className="space-y-4" id="recall_meals_fields">
            {meals.map((m, index) => (
              <div key={m.comida} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                <div className="md:col-span-2 py-1.5">
                  <span className="font-bold text-slate-700 text-xs uppercase tracking-wide block">
                    {m.comida}
                  </span>
                </div>
                
                <div className="md:col-span-3">
                  <input
                    type="text"
                    value={m.descripcion}
                    onChange={(e) => handleMealFieldChange(index, 'descripcion', e.target.value)}
                    placeholder="Preparación (Ej. Sopa, huevo frito)"
                    className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div className="md:col-span-3">
                  <input
                    type="text"
                    value={m.ingredientes}
                    onChange={(e) => handleMealFieldChange(index, 'ingredientes', e.target.value)}
                    placeholder="Ingredientes (Ej. Papa, huevo, aceite)"
                    className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={m.medidaCasera}
                    onChange={(e) => handleMealFieldChange(index, 'medidaCasera', e.target.value)}
                    placeholder="Medida Casera"
                    className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="relative">
                    <input
                      type="number"
                      value={m.gramos || ''}
                      onChange={(e) => handleMealFieldChange(index, 'gramos', parseInt(e.target.value) || 0)}
                      placeholder="Peso"
                      className="block w-full pl-2.5 pr-8 py-1.5 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-right"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[10px] text-slate-400 font-mono">
                      g
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setActiveRecall(null)}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-500 font-medium hover:bg-slate-50 transition-all text-sm"
            >
              Cerrar Formulario
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all text-sm flex items-center space-x-2 shadow-md shadow-blue-100"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Guardando...' : 'Guardar y Finalizar'}</span>
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
