import React, { useState } from 'react';
import { Patient, FoodFrequency } from '../types';
import { Save, ClipboardList, CheckCircle2, Apple } from 'lucide-react';

interface FcaFormProps {
  patient: Patient;
  onUpdatePatient: (updated: Patient) => void;
}

const FOOD_GROUPS = [
  'Lácteos (Leche entera, yogur, queso, etc.)',
  'Carnes (Pollo, res, cerdo, pescado)',
  'Huevos',
  'Leguminosas (Lentejas, fríjoles, garbanzos, blanquillos)',
  'Cereales, Raíces y Tubérculos (Arroz, papa, plátano, arepa, pan)',
  'Verduras (Zanahoria, brócoli, calabacín, espinaca)',
  'Frutas (Banano, mango, manzana, pera, fresa)',
  'Grasas (Aceite, mantequilla, aguacate)',
  'Dulces, Azúcares y Bebidas Azucaradas (Galletas, jugos de caja, dulces)'
];

export default function FcaForm({ patient, onUpdatePatient }: FcaFormProps) {
  // Initialize state from existing patient FCA data or defaults
  const [fcaList, setFcaList] = useState<FoodFrequency[]>(() => {
    if (patient.fca && patient.fca.length > 0) {
      return patient.fca;
    }
    // Seed default list
    return FOOD_GROUPS.map((group, idx) => ({
      id: `fca_seed_${idx}`,
      grupo: group,
      frecuencia: '',
      porciones: '',
      observaciones: ''
    }));
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleFieldChange = (index: number, field: keyof FoodFrequency, value: string) => {
    const updated = [...fcaList];
    updated[index] = { ...updated[index], [field]: value };
    setFcaList(updated);
    setSuccess(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const updatedPatient: Patient = {
        ...patient,
        fca: fcaList
      };

      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPatient)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la frecuencia de consumo');
      }

      onUpdatePatient(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm" id="fca_form_panel">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 mb-6 gap-3">
        <div className="flex items-center space-x-2 text-blue-600">
          <Apple className="h-6 w-6" />
          <div>
            <h3 className="text-lg font-bold text-slate-800">Frecuencia de Consumo de Alimentos (FCA)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Evalúa el patrón habitual de ingesta alimentaria del niño</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          id="btn_save_fca"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all text-sm space-x-2 cursor-pointer self-start sm:self-auto shadow-md shadow-blue-100"
        >
          <Save className="h-4 w-4" />
          <span>{loading ? 'Guardando...' : 'Guardar Cuestionario'}</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl text-xs">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-blue-500" />
          <span>Frecuencia de consumo de alimentos guardada con éxito.</span>
        </div>
      )}

      {/* FCA Form Table */}
      <div className="overflow-x-auto" id="fca_table_wrapper">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
              <th className="pb-3 w-1/3">Grupo de Alimentos</th>
              <th className="pb-3 w-1/6">Frecuencia</th>
              <th className="pb-3 w-1/6">Porciones / Medida</th>
              <th className="pb-3 w-1/3">Observaciones / Detalles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {fcaList.map((ff, index) => (
              <tr key={ff.id || index} className="group hover:bg-slate-50/45 transition-colors">
                <td className="py-4 pr-4 font-medium text-slate-700">
                  {ff.grupo}
                </td>
                <td className="py-4 pr-4">
                  <select
                    value={ff.frecuencia}
                    onChange={(e) => handleFieldChange(index, 'frecuencia', e.target.value as any)}
                    className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-xs text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                  >
                    <option value="">Seleccione...</option>
                    <option value="Diario">Diario</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Quincenal">Quincenal</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Nunca">Nunca</option>
                  </select>
                </td>
                <td className="py-4 pr-4">
                  <input
                    type="text"
                    value={ff.porciones}
                    onChange={(e) => handleFieldChange(index, 'porciones', e.target.value)}
                    placeholder="Ej. 1 vaso, 2 cdas"
                    className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-xs text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-slate-300 transition-all"
                  />
                </td>
                <td className="py-4">
                  <input
                    type="text"
                    value={ff.observaciones}
                    onChange={(e) => handleFieldChange(index, 'observaciones', e.target.value)}
                    placeholder="Ej. Marcas, preferences, aversiones..."
                    className="block w-full px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white text-xs text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-slate-300 transition-all"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-900 transition-all text-sm space-x-2 cursor-pointer shadow-sm"
        >
          <Save className="h-4 w-4" />
          <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
        </button>
      </div>

    </div>
  );
}
