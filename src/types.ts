export interface User {
  id: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string;
  correo: string;
  telefono: string;
  rol: 'administrador' | 'usuario';
  imagenPerfil?: string;
  password?: string; // 4-digit code hashed or plain for simple auth
  activo: boolean;
}

export interface VerificationCode {
  id: string;
  correo: string;
  codigo: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string;
  telefono: string;
  password?: string;
  createdAt: string;
}

export interface ChronologicalAge {
  years: number;
  months: number;
  days: number;
}

export interface Evaluation {
  id: string;
  fecha: string;
  peso: number; // kg
  talla: number; // cm
  pliegueSubescapular: number; // mm
  pliegueTricipital: number; // mm
  perimetroBrazo: number; // cm
  perimetroCefalico: number; // cm
  
  // Classifications calculated at evaluation time
  perimetroCefalicoZ?: number;
  perimetroCefalicoClass?: string;
  pesoTallaZ?: number;
  pesoTallaClass?: string;
  tallaEdadZ?: number;
  tallaEdadClass?: string;
  
  // Caloric requirements computed
  caloriasRecomendadas?: number;
  pesoUsadoParaFormula?: 'actual' | 'ideal';
  pesoIdealCalculado?: number;
}

export interface FoodFrequency {
  id: string;
  grupo: string;
  frecuencia: 'Diario' | 'Semanal' | 'Quincenal' | 'Mensual' | 'Nunca' | '';
  porciones: string;
  observaciones: string;
}

export interface RecallMeal {
  comida: 'Desayuno' | 'Media Mañana' | 'Almuerzo' | 'Media Tarde' | 'Cena' | 'Colación Nocturna';
  descripcion: string;
  ingredientes: string;
  medidaCasera: string;
  gramos: number;
}

export interface Recall24H {
  id: string;
  fecha: string;
  comidas: RecallMeal[];
  observacionesGenerales: string;
}

export interface DietPlan {
  id: string;
  fecha: string;
  distribucionMacronutrientes: {
    carbohidratosPorcentaje: number; // %
    proteinasPorcentaje: number; // %
    grasasPorcentaje: number; // %
    carbohidratosGramos: number; // g
    proteinasGramos: number; // g
    grasasGramos: number; // g
    totalCalorias: number;
  };
  comidas: {
    nombre: string; // Desayuno, etc.
    descripcion: string;
  }[];
  indicacionesGenerales: string;
}

export interface Patient {
  id: string;
  nombre: string;
  genero: 'niño' | 'niña';
  fechaNacimiento: string;
  fechaRegistro: string;
  evaluaciones: Evaluation[];
  fca: FoodFrequency[];
  recordatorios: Recall24H[];
  planesAlimentacion: DietPlan[];
}
