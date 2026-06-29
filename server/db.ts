import { MongoClient, Db } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { User, Patient, VerificationCode } from '../src/types';

const LOCAL_DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'soma_db.json')
  : path.join(process.cwd(), 'soma_db.json');

// Hardcoded Administrator accounts required by the user
const NATIVE_ADMINS: User[] = [
  {
    id: 'admin_natalia',
    nombre: 'Natalia',
    apellidos: 'Hernández',
    fechaNacimiento: '1995-12-31',
    correo: 'nataliahernandez3112@gmail.com',
    telefono: '3000000001',
    rol: 'administrador',
    activo: true,
    password: '3112' // Simple plain-text matching or hashing
  },
  {
    id: 'admin_maria',
    nombre: 'María',
    apellidos: 'Ibarra',
    fechaNacimiento: '1996-09-28',
    correo: 'maria-i01@hotmail.com',
    telefono: '3000000002',
    rol: 'administrador',
    activo: true,
    password: '2809'
  }
];

// In-memory data store structure for local fallback
interface LocalDatabase {
  users: User[];
  patients: Patient[];
  verificationCodes: VerificationCode[];
}

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let useMongo = false;
let dbInitialized = false;
let dbInitializingPromise: Promise<void> | null = null;

// Helper functions to get collection references with 'any' cast to bypass strict ObjectId types for custom string _ids
const colUsers = () => {
  if (!mongoDb) throw new Error('Database not connected');
  return mongoDb.collection('users') as any;
};
const colPatients = () => {
  if (!mongoDb) throw new Error('Database not connected');
  return mongoDb.collection('patients') as any;
};
const colVerificationCodes = () => {
  if (!mongoDb) throw new Error('Database not connected');
  return mongoDb.collection('verification_codes') as any;
};

// Initialize Database connection
export async function initDatabase(): Promise<void> {
  if (dbInitialized) return;
  if (dbInitializingPromise) return dbInitializingPromise;

  dbInitializingPromise = (async () => {
    const uri = process.env.MONGODB_URI;
    if (uri) {
      try {
        console.log('Connecting to MongoDB Atlas...');
        mongoClient = new MongoClient(uri);
        await mongoClient.connect();
        mongoDb = mongoClient.db('soma_nutricion');
        useMongo = true;
        console.log('Successfully connected to MongoDB Atlas!');

        // Ensure collections and migration
        const usersCol = colUsers();
        const patientsCol = colPatients();

        const userCount = await usersCol.countDocuments();
        const patientCount = await patientsCol.countDocuments();

        let localData: LocalDatabase | null = null;
        if (fs.existsSync(LOCAL_DB_PATH)) {
          try {
            const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
            localData = JSON.parse(raw);
          } catch (e) {
            console.error('Error reading local JSON for migration:', e);
          }
        }

        // Migrate users
        if (userCount === 0) {
          const usersToInsert = localData?.users || NATIVE_ADMINS;
          for (const user of usersToInsert) {
            const exists = await usersCol.findOne({ correo: user.correo });
            if (!exists) {
              await usersCol.insertOne({ _id: user.id, ...user });
            }
          }
          console.log('Users migrated/seeded to MongoDB.');
        } else {
          // Just make sure native admins exist
          for (const admin of NATIVE_ADMINS) {
            const exists = await usersCol.findOne({ correo: admin.correo });
            if (!exists) {
              await usersCol.insertOne({ _id: admin.id, ...admin });
              console.log(`Pre-seeded Admin in MongoDB: ${admin.correo}`);
            }
          }
        }

        // Migrate patients
        if (patientCount === 0) {
          const patientsToInsert = localData?.patients || getSamplePatients();
          for (const p of patientsToInsert) {
            await patientsCol.insertOne({ _id: p.id, ...p });
          }
          console.log('Patients migrated/seeded to MongoDB.');
        }

        dbInitialized = true;
        return;
      } catch (err) {
        console.error('Failed to connect to MongoDB Atlas, falling back to local JSON file storage.', err);
      }
    }

    // Fallback Local File DB initialization
    useMongo = false;
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      const initialDb: LocalDatabase = {
        users: [...NATIVE_ADMINS],
        patients: getSamplePatients(),
        verificationCodes: []
      };
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initialDb, null, 2), 'utf-8');
      console.log(`Local file database created at ${LOCAL_DB_PATH} with pre-seeded admins.`);
    } else {
      // Read and verify native admins are present
      try {
        const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
        const data: LocalDatabase = JSON.parse(raw);
        let modified = false;
        for (const admin of NATIVE_ADMINS) {
          if (!data.users.find(u => u.correo === admin.correo)) {
            data.users.push(admin);
            modified = true;
          }
        }
        if (modified) {
          fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
        }
      } catch (e) {
        console.error('Error reading local JSON file, resetting storage...', e);
        const initialDb: LocalDatabase = {
          users: [...NATIVE_ADMINS],
          patients: getSamplePatients(),
          verificationCodes: []
        };
        fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initialDb, null, 2), 'utf-8');
      }
    }
    dbInitialized = true;
  })();

  return dbInitializingPromise;
}

// Read database contents helper (for local)
function readLocalDb(): LocalDatabase {
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { users: [...NATIVE_ADMINS], patients: [], verificationCodes: [] };
  }
}

// Write database contents helper (for local)
function writeLocalDb(data: LocalDatabase) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// --- DATABASE OPERATIONS ---

// 1. Users Operations
export async function getUsers(): Promise<User[]> {
  if (useMongo && mongoDb) {
    const users = await colUsers().find({}).toArray();
    return users.map(u => ({ ...u, id: u._id.toString() } as unknown as User));
  } else {
    return readLocalDb().users;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const emailLower = email.toLowerCase().trim();
  if (useMongo && mongoDb) {
    const user = await colUsers().findOne({ correo: { $regex: new RegExp(`^${emailLower}$`, 'i') } });
    if (!user) return null;
    return { ...user, id: user._id.toString() } as unknown as User;
  } else {
    const db = readLocalDb();
    return db.users.find(u => u.correo.toLowerCase() === emailLower) || null;
  }
}

export async function createUser(user: User): Promise<User> {
  if (useMongo && mongoDb) {
    // Check if user already exists
    const existing = await colUsers().findOne({ correo: user.correo });
    if (existing) {
      throw new Error('El correo ya está registrado');
    }
    await colUsers().insertOne({ _id: user.id, ...user });
    return user;
  } else {
    const db = readLocalDb();
    // Prevent duplicate
    if (db.users.find(u => u.correo.toLowerCase() === user.correo.toLowerCase())) {
      throw new Error('El correo ya está registrado');
    }
    db.users.push(user);
    writeLocalDb(db);
    return user;
  }
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  if (useMongo && mongoDb) {
    const { id: _, ...updateFields } = updates;
    await colUsers().updateOne(
      { _id: id },
      { $set: updateFields }
    );
    const user = await colUsers().findOne({ _id: id });
    return user ? ({ ...user, id: user._id.toString() } as unknown as User) : null;
  } else {
    const db = readLocalDb();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    db.users[idx] = { ...db.users[idx], ...updates };
    writeLocalDb(db);
    return db.users[idx];
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  if (useMongo && mongoDb) {
    const res = await colUsers().deleteOne({ _id: id });
    return res.deletedCount > 0;
  } else {
    const db = readLocalDb();
    const len = db.users.length;
    db.users = db.users.filter(u => u.id !== id);
    writeLocalDb(db);
    return db.users.length < len;
  }
}

// 2. Verification Codes Operations
export async function createVerificationCode(item: VerificationCode): Promise<VerificationCode> {
  if (useMongo && mongoDb) {
    await colVerificationCodes().deleteOne({ correo: item.correo });
    await colVerificationCodes().insertOne({ _id: item.id, ...item });
    return item;
  } else {
    const db = readLocalDb();
    // Delete any previous code for the same email
    db.verificationCodes = db.verificationCodes.filter(vc => vc.correo.toLowerCase() !== item.correo.toLowerCase());
    db.verificationCodes.push(item);
    writeLocalDb(db);
    return item;
  }
}

export async function getVerificationCode(email: string, code: string): Promise<VerificationCode | null> {
  const emailLower = email.toLowerCase().trim();
  const codeTrimmed = code.trim();
  if (useMongo && mongoDb) {
    const item = await colVerificationCodes().findOne({
      correo: { $regex: new RegExp(`^${emailLower}$`, 'i') },
      codigo: codeTrimmed
    });
    return item ? (item as unknown as VerificationCode) : null;
  } else {
    const db = readLocalDb();
    return db.verificationCodes.find(
      vc => vc.correo.toLowerCase() === emailLower && vc.codigo === codeTrimmed
    ) || null;
  }
}

export async function getVerificationCodesList(): Promise<VerificationCode[]> {
  if (useMongo && mongoDb) {
    const items = await colVerificationCodes().find({}).toArray();
    return items as unknown as VerificationCode[];
  } else {
    return readLocalDb().verificationCodes;
  }
}

export async function deleteVerificationCode(email: string): Promise<void> {
  if (useMongo && mongoDb) {
    await colVerificationCodes().deleteMany({ correo: { $regex: new RegExp(`^${email}$`, 'i') } });
  } else {
    const db = readLocalDb();
    db.verificationCodes = db.verificationCodes.filter(vc => vc.correo.toLowerCase() !== email.toLowerCase());
    writeLocalDb(db);
  }
}

// 3. Patients Operations
export async function getPatients(): Promise<Patient[]> {
  if (useMongo && mongoDb) {
    const patients = await colPatients().find({}).toArray();
    return patients.map(p => ({ ...p, id: p._id.toString() } as unknown as Patient));
  } else {
    return readLocalDb().patients;
  }
}

export async function getPatientById(id: string): Promise<Patient | null> {
  if (useMongo && mongoDb) {
    const patient = await colPatients().findOne({ _id: id });
    return patient ? ({ ...patient, id: patient._id.toString() } as unknown as Patient) : null;
  } else {
    return readLocalDb().patients.find(p => p.id === id) || null;
  }
}

export async function createPatient(patient: Patient): Promise<Patient> {
  if (useMongo && mongoDb) {
    await colPatients().insertOne({ _id: patient.id, ...patient });
    return patient;
  } else {
    const db = readLocalDb();
    db.patients.push(patient);
    writeLocalDb(db);
    return patient;
  }
}

export async function updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | null> {
  if (useMongo && mongoDb) {
    const { id: _, ...updateFields } = updates;
    await colPatients().updateOne(
      { _id: id },
      { $set: updateFields }
    );
    const patient = await colPatients().findOne({ _id: id });
    return patient ? ({ ...patient, id: patient._id.toString() } as unknown as Patient) : null;
  } else {
    const db = readLocalDb();
    const idx = db.patients.findIndex(p => p.id === id);
    if (idx === -1) return null;
    db.patients[idx] = { ...db.patients[idx], ...updates };
    writeLocalDb(db);
    return db.patients[idx];
  }
}

export async function deletePatient(id: string): Promise<boolean> {
  if (useMongo && mongoDb) {
    const res = await colPatients().deleteOne({ _id: id });
    return res.deletedCount > 0;
  } else {
    const db = readLocalDb();
    const len = db.patients.length;
    db.patients = db.patients.filter(p => p.id !== id);
    writeLocalDb(db);
    return db.patients.length < len;
  }
}

export function isConnectedToMongo(): boolean {
  return useMongo;
}

// Generate pre-seeded patient list for rich clinical context
function getSamplePatients(): Patient[] {
  return [
    {
      id: 'patient_sofia',
      nombre: 'Sofía Valentina Gómez',
      genero: 'niña',
      fechaNacimiento: '2024-03-12', // ~2.2 years old in June 2026
      fechaRegistro: '2026-05-10T12:00:00Z',
      evaluaciones: [
        {
          id: 'eval_sofia_1',
          fecha: '2026-06-20T10:00:00Z',
          peso: 12.8,
          talla: 88.5,
          pliegueSubescapular: 6,
          pliegueTricipital: 8,
          perimetroBrazo: 14.2,
          perimetroCefalico: 47.8,
          // Pre-calculated metrics to seed the charts beautifully
          perimetroCefalicoZ: 0.5,
          perimetroCefalicoClass: 'Normal',
          pesoTallaZ: 0.4,
          pesoTallaClass: 'peso adecuado para la talla',
          tallaEdadZ: 0.2,
          tallaEdadClass: 'talla adecuada para la edad',
          caloriasRecomendadas: 1045.2,
          pesoUsadoParaFormula: 'actual',
          pesoIdealCalculado: 12.3
        }
      ],
      fca: [
        { id: 'fca_1', grupo: 'Lácteos (Leche, Yogur, Queso)', frecuencia: 'Diario', porciones: '2 vasos/día', observaciones: 'Toma leche entera' },
        { id: 'fca_2', grupo: 'Carnes, Pescados, Pollo', frecuencia: 'Diario', porciones: '1 porción', observaciones: 'Prefiere pollo desmechado' },
        { id: 'fca_3', grupo: 'Huevos', frecuencia: 'Diario', porciones: '1 unidad', observaciones: 'Huevo cocido' },
        { id: 'fca_4', grupo: 'Leguminosas (Fríjoles, Lentejas)', frecuencia: 'Semanal', porciones: '2 veces/semana', observaciones: 'Lentejas cocidas' },
        { id: 'fca_5', grupo: 'Verduras', frecuencia: 'Semanal', porciones: '3 veces/semana', observaciones: 'Le cuesta comer hojas verdes' },
        { id: 'fca_6', grupo: 'Frutas', frecuencia: 'Diario', porciones: '2 porciones', observaciones: 'Prefiere banano y manzana' },
        { id: 'fca_7', grupo: 'Grasas (Aceites, Mantequilla)', frecuencia: 'Diario', porciones: '1 cdta', observaciones: 'Aceite de oliva en verduras' },
        { id: 'fca_8', grupo: 'Dulces, Azúcar, Galletas', frecuencia: 'Semanal', porciones: '1 vez/semana', observaciones: 'Galletas de avena ocasionales' }
      ],
      recordatorios: [
        {
          id: 'rec_sofia_1',
          fecha: '2026-06-20T10:00:00Z',
          comidas: [
            { comida: 'Desayuno', descripcion: 'Huevo revuelto con arepa de maíz y cacao con leche', ingredientes: '1 huevo, 1 arepa mediana, 1 taza leche entera', medidaCasera: 'Plato mediano y pocillo', gramos: 250 },
            { comida: 'Media Mañana', descripcion: 'Manzana picada', ingredientes: 'Media manzana roja', medidaCasera: 'Medio tazón', gramos: 80 },
            { comida: 'Almuerzo', descripcion: 'Arroz con pollo picado, puré de papa y zanahoria', ingredientes: 'Pollo desmechado, arroz, papa cocida, zanahoria', medidaCasera: 'Taza y media', gramos: 180 },
            { comida: 'Media Tarde', descripcion: 'Yogur de fresa infantil', ingredientes: 'Yogur entero', medidaCasera: '1 vaso pequeño', gramos: 120 },
            { comida: 'Cena', descripcion: 'Sopa de verduras con fideos y carne molida', ingredientes: 'Carne de res, fideos, calabacín, zanahoria', medidaCasera: '1 taza honda', gramos: 200 }
          ],
          observacionesGenerales: 'Acepta bien los alimentos sólidos. Hidratación adecuada con agua.'
        }
      ],
      planesAlimentacion: [
        {
          id: 'plan_sofia_1',
          fecha: '2026-06-20T10:00:00Z',
          distribucionMacronutrientes: {
            carbohidratosPorcentaje: 50,
            proteinasPorcentaje: 15,
            grasasPorcentaje: 35,
            carbohidratosGramos: 130.6,
            proteinasGramos: 39.2,
            grasasGramos: 40.6,
            totalCalorias: 1045
          },
          comidas: [
            { nombre: 'Desayuno (8:00 AM)', descripcion: '1 huevo pochado + 1 rodaja de pan integral + 1 taza de leche tibia entera.' },
            { nombre: 'Media Mañana (10:30 AM)', descripcion: 'Fruta fresca variada (mango picado o fresas) + 3 almendras trituradas.' },
            { nombre: 'Almuerzo (12:30 PM)', descripcion: '60g de pechuga de pollo a la plancha picadita + 4 cucharadas de arroz blanco + 3 cucharadas de puré de calabaza con un chorrito de aceite de oliva.' },
            { nombre: 'Media Tarde (4:00 PM)', descripcion: '1 yogur natural sin azúcar con puré de banano.' },
            { nombre: 'Cena (7:00 PM)', descripcion: 'Tortilla de espinacas picadita + media papa cocida en rodajas + agua.' }
          ],
          indicacionesGenerales: 'Evitar jugos azucarados o bebidas artificiales. Priorizar siempre fruta entera. Fomentar la masticación activa.'
        }
      ]
    },
    {
      id: 'patient_mateo',
      nombre: 'Mateo Alejandro Torres',
      genero: 'niño',
      fechaNacimiento: '2022-11-05', // ~3.7 years old in June 2026
      fechaRegistro: '2026-06-01T15:30:00Z',
      evaluaciones: [
        {
          id: 'eval_mateo_1',
          fecha: '2026-06-01T15:30:00Z',
          peso: 19.8, // Overweight/obese for age 3 years 7 months, taller: 100 cm
          talla: 100.0,
          pliegueSubescapular: 9,
          pliegueTricipital: 12,
          perimetroBrazo: 16.5,
          perimetroCefalico: 50.4,
          perimetroCefalicoZ: 0.2,
          perimetroCefalicoClass: 'Normal',
          pesoTallaZ: 2.3, // Overweight / obese classification
          pesoTallaClass: 'sobrepeso',
          tallaEdadZ: 0.7,
          tallaEdadClass: 'talla adecuada para la edad',
          caloriasRecomendadas: 1195.4, // calculated based on IDEAL weight for talla
          pesoUsadoParaFormula: 'ideal',
          pesoIdealCalculado: 15.2
        }
      ],
      fca: [
        { id: 'fca_m1', grupo: 'Lácteos (Leche, Yogur, Queso)', frecuencia: 'Diario', porciones: '3 tazas/día', observaciones: 'Bebe mucha leche azucarada' },
        { id: 'fca_m2', grupo: 'Carnes, Pescados, Pollo', frecuencia: 'Diario', porciones: '1 porción', observaciones: 'Acepta carne frita de res' },
        { id: 'fca_m3', grupo: 'Huevos', frecuencia: 'Diario', porciones: '2 unidades', observaciones: 'Fritos en mantequilla' },
        { id: 'fca_m4', grupo: 'Leguminosas (Fríjoles, Lentejas)', frecuencia: 'Semanal', porciones: '1 vez/semana', observaciones: 'Prefiere lentejas con salchicha' },
        { id: 'fca_m5', grupo: 'Verduras', frecuencia: 'Nunca', porciones: '0', observaciones: 'Las rechaza sistemáticamente' },
        { id: 'fca_m6', grupo: 'Frutas', frecuencia: 'Quincenal', porciones: 'Ocasional', observaciones: 'Poco interés por frutas enteras' },
        { id: 'fca_m7', grupo: 'Grasas (Aceites, Mantequilla)', frecuencia: 'Diario', porciones: '2 cdas', observaciones: 'Mucho frito en casa' },
        { id: 'fca_m8', grupo: 'Dulces, Azúcar, Galletas', frecuencia: 'Diario', porciones: 'Diario', observaciones: 'Consume cereales azucarados y jugos de caja' }
      ],
      recordatorios: [
        {
          id: 'rec_mateo_1',
          fecha: '2026-06-01T15:30:00Z',
          comidas: [
            { comida: 'Desayuno', descripcion: 'Cereal de hojuelas azucaradas con leche y jugo de caja sabor naranja', ingredientes: 'Cereal azucarado, leche entera, jugo artificial', medidaCasera: 'Tazón grande y caja de cartón', gramos: 350 },
            { comida: 'Media Mañana', descripcion: 'Paquete de galletas de chocolate rellenitas', ingredientes: 'Galletas de paquete, azúcar', medidaCasera: '1 paquete', gramos: 64 },
            { comida: 'Almuerzo', descripcion: 'Salchipapa con salsa de tomate y gaseosa de cola', ingredientes: 'Papas fritas, salchichas, salsa de tomate, gaseosa', medidaCasera: 'Plato colmado y vaso grande', gramos: 450 },
            { comida: 'Media Tarde', descripcion: 'Helado de paleta de agua', ingredientes: 'Paleta azucarada', medidaCasera: '1 paleta', gramos: 70 },
            { comida: 'Cena', descripcion: 'Nuggets de pollo fritos con papas chips de bolsa', ingredientes: 'Nuggets comerciales, papas en paquete', medidaCasera: 'Plato mediano', gramos: 150 }
          ],
          observacionesGenerales: 'Alimentación hipercalórica, rica en azúcares refinados y grasas trans. Nulo consumo de fibra.'
        }
      ],
      planesAlimentacion: [
        {
          id: 'plan_mateo_1',
          fecha: '2026-06-01T15:30:00Z',
          distribucionMacronutrientes: {
            carbohidratosPorcentaje: 55,
            proteinasPorcentaje: 18,
            grasasPorcentaje: 27,
            carbohidratosGramos: 164.4,
            proteinasGramos: 53.8,
            grasasGramos: 35.9,
            totalCalorias: 1195
          },
          comidas: [
            { nombre: 'Desayuno (7:30 AM)', descripcion: 'Avena cocida en leche descremada sin azúcar, con canela y rodajas de banano por encima.' },
            { nombre: 'Media Mañana (10:00 AM)', descripcion: '1 mandarina mediana entera para masticar + 1 vaso de agua pura.' },
            { nombre: 'Almuerzo (1:00 PM)', descripcion: '75g de filete de pescado (corvina o merluza) al vapor + 3 cucharadas de arroz integral + ensalada fresca rallada de zanahoria y manzana con limón.' },
            { nombre: 'Media Tarde (4:30 PM)', descripcion: 'Palitos de zanahoria y pepino con hummus suave o queso crema light.' },
            { nombre: 'Cena (7:30 PM)', descripcion: 'Pechuga de pollo a la plancha (60g) con trozos de brócoli al vapor y una rodaja pequeña de arepa de maíz sin grasa.' }
          ],
          indicacionesGenerales: 'Eliminar por completo gaseosas, jugos envasados y paquetes procesados. Fomentar juegos activos al aire libre al menos 60 minutos diarios.'
        }
      ]
    },
    {
      id: 'patient_mario',
      nombre: 'Mario José Espitia',
      genero: 'niño',
      fechaNacimiento: '2025-11-20', // ~7 months old in June 2026
      fechaRegistro: '2026-06-25T09:00:00Z',
      evaluaciones: [
        {
          id: 'eval_mario_1',
          fecha: '2026-06-25T09:00:00Z',
          peso: 5.6, // Low weight for a boy of 7 months, talla: 64 cm. Severe risk/malnutrition.
          talla: 64.0,
          pliegueSubescapular: 3,
          pliegueTricipital: 4,
          perimetroBrazo: 11.2, // MUAC < 11.5 cm -> Red alert triggers!
          perimetroCefalico: 41.5,
          perimetroCefalicoZ: -1.5,
          perimetroCefalicoClass: 'Normal',
          pesoTallaZ: -2.5, // desnutrición aguda moderada
          pesoTallaClass: 'desnutrición aguda moderada',
          tallaEdadZ: -1.7,
          tallaEdadClass: 'riesgo de talla baja',
          caloriasRecomendadas: 656.4,
          pesoUsadoParaFormula: 'actual',
          pesoIdealCalculado: 7.0
        }
      ],
      fca: [
        { id: 'fca_mario_1', grupo: 'Leche Materna', frecuencia: 'Diario', porciones: 'Libre demanda', observaciones: 'Alimentación exclusiva hasta los 6 meses' },
        { id: 'fca_mario_2', grupo: 'Papillas de Frutas/Verduras', frecuencia: 'Diario', porciones: '1 vez/día', observaciones: 'Iniciando alimentación complementaria' },
        { id: 'fca_mario_3', grupo: 'Proteínas (Pollo/Carne)', frecuencia: 'Nunca', porciones: '0', observaciones: 'Aún no introducido por temor familiar' }
      ],
      recordatorios: [
        {
          id: 'rec_mario_1',
          fecha: '2026-06-25T09:00:00Z',
          comidas: [
            { comida: 'Desayuno', descripcion: 'Seno materno', ingredientes: 'Leche humana', medidaCasera: 'Libre demanda', gramos: 100 },
            { comida: 'Media Mañana', descripcion: 'Seno materno', ingredientes: 'Leche humana', medidaCasera: 'Seno', gramos: 100 },
            { comida: 'Almuerzo', descripcion: 'Papilla aguada de auyama y agua de panela', ingredientes: 'Auyama, panela cocida', medidaCasera: '3 cucharaditas infantiles', gramos: 30 },
            { comida: 'Media Tarde', descripcion: 'Seno materno', ingredientes: 'Leche humana', medidaCasera: 'Seno', gramos: 100 },
            { comida: 'Cena', descripcion: 'Seno materno', ingredientes: 'Leche humana', medidaCasera: 'Seno', gramos: 100 }
          ],
          observacionesGenerales: 'Bajo aporte de sólidos. Alimentación complementaria diluida. Requiere fortalecimiento inmediato.'
        }
      ],
      planesAlimentacion: [
        {
          id: 'plan_mario_1',
          fecha: '2026-06-25T09:00:00Z',
          distribucionMacronutrientes: {
            carbohidratosPorcentaje: 45,
            proteinasPorcentaje: 17,
            grasasPorcentaje: 38,
            carbohidratosGramos: 73.8,
            proteinasGramos: 27.9,
            grasasGramos: 27.7,
            totalCalorias: 656
          },
          comidas: [
            { nombre: 'Alimentación Base', descripcion: 'Continuar lactancia materna a libre demanda (día y noche). Es su principal fuente de energía.' },
            { nombre: 'Comida 1 (Papilla de Hierro - 10:00 AM)', descripcion: 'Puré espeso de hígado de pollo cocido (1 cda) bien triturado con puré de papa criolla (2 cdas) + un chorrito de leche materna para dar consistencia cremosa (no líquida).' },
            { nombre: 'Comida 2 (Papilla Energética - 3:00 PM)', descripcion: 'Papilla espesa de plátano bien maduro triturado con una cucharadita de aceite de coco o canola.' },
            { nombre: 'Comida 3 (Cena - 6:00 PM)', descripcion: 'Lentejas cocidas muy suaves y trituradas hasta formar un puré homogéneo con un trocito de yema de huevo cocida.' }
          ],
          indicacionesGenerales: 'Alerta roja por desnutrición aguda moderada con perímetro braquial bajo (11.2 cm). ATENCIÓN INTEGRADA A LA DESNUTRICIÓN AGUDA (Seguimiento prioritario cada 8 días).'
        }
      ]
    }
  ];
}
