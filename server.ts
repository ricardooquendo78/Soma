import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import {
  initDatabase,
  getUsers,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  createVerificationCode,
  getVerificationCode,
  getVerificationCodesList,
  deleteVerificationCode,
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  isConnectedToMongo
} from './server/db.js';
import { Patient, User, VerificationCode } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Ensure database is initialized before serving any request (critical for serverless)
app.use(async (req, res, next) => {
  try {
    await initDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

// API ROUTES
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isConnectedToMongo() ? 'MongoDB Atlas' : 'Local JSON Fallback',
    timestamp: new Date().toISOString()
  });
});

// Auth Routes

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password) {
      return res.status(400).json({ error: 'Correo y clave son requeridos' });
    }

    const user = await getUserByEmail(correo);
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    // Direct password match (for simplified 4-digit numeric passwords)
    if (user.password !== password.toString()) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Don't send password to client
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, token: `session_${user.id}_${Date.now()}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Step 1: Request Verification Code (New registration)
app.post('/api/auth/request-code', async (req, res) => {
  try {
    const { nombre, apellidos, fechaNacimiento, correo, telefono, password } = req.body;

    if (!nombre || !apellidos || !correo || !telefono || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(correo);
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    // Generate a 5-digit verification code
    const verificationCodeStr = Math.floor(10000 + Math.random() * 90000).toString();

    const pendingItem: VerificationCode = {
      id: `verify_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      correo: correo.toLowerCase().trim(),
      codigo: verificationCodeStr,
      nombre,
      apellidos,
      fechaNacimiento,
      telefono,
      password: password.toString(),
      createdAt: new Date().toISOString()
    };

    await createVerificationCode(pendingItem);

    // In a real system, we'd send an email. For this app, we will allow administrators to see it in their UI.
    // Also log it to terminal so developers can see it instantly
    console.log(`[AUTH] CÓDIGO DE VERIFICACIÓN GENERADO para ${correo}: ${verificationCodeStr}`);

    res.json({
      success: true,
      message: 'Código solicitado con éxito. Por favor pídale el código a Natalia o María.',
      debugCode: verificationCodeStr // Included for easy development preview testing
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Step 2: Verify Code and Create Profile
app.post('/api/auth/register-verify', async (req, res) => {
  try {
    const { correo, codigo } = req.body;
    if (!correo || !codigo) {
      return res.status(400).json({ error: 'Correo y código de verificación son requeridos' });
    }

    const pending = await getVerificationCode(correo, codigo);
    if (!pending) {
      return res.status(400).json({ error: 'El código de verificación es inválido para este correo' });
    }

    const newUser: User = {
      id: `user_${Date.now()}`,
      nombre: pending.nombre,
      apellidos: pending.apellidos,
      fechaNacimiento: pending.fechaNacimiento,
      correo: pending.correo,
      telefono: pending.telefono,
      rol: 'usuario',
      password: pending.password,
      activo: true
    };

    await createUser(newUser);
    await deleteVerificationCode(pending.correo);

    const { password: _, ...safeUser } = newUser;
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: safeUser,
      token: `session_${newUser.id}_${Date.now()}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-only route to see pending verification codes
app.get('/api/auth/pending-codes', async (req, res) => {
  try {
    const codes = await getVerificationCodesList();
    res.json(codes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-only: Get all users
app.get('/api/auth/users', async (req, res) => {
  try {
    const users = await getUsers();
    const safeUsers = users.map(({ password: _, ...u }) => u);
    res.json(safeUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-only: Update user status or details
app.put('/api/auth/users/:id', async (req, res) => {
  try {
    const updated = await updateUser(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const { password: _, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin-only: Delete user
app.delete('/api/auth/users/:id', async (req, res) => {
  try {
    const success = await deleteUser(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Patient Routes

// List patients
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await getPatients();
    res.json(patients);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get patient by ID
app.get('/api/patients/:id', async (req, res) => {
  try {
    const patient = await getPatientById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    res.json(patient);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create Patient
app.post('/api/patients', async (req, res) => {
  try {
    const { nombre, genero, fechaNacimiento } = req.body;
    if (!nombre || !genero || !fechaNacimiento) {
      return res.status(400).json({ error: 'Nombre, género y fecha de nacimiento son requeridos' });
    }

    const newPatient: Patient = {
      id: `patient_${Date.now()}`,
      nombre,
      genero,
      fechaNacimiento,
      fechaRegistro: new Date().toISOString(),
      evaluaciones: req.body.evaluaciones || [],
      fca: req.body.fca || [],
      recordatorios: req.body.recordatorios || [],
      planesAlimentacion: req.body.planesAlimentacion || []
    };

    const saved = await createPatient(newPatient);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Patient (full updates of evaluations, FCA, recordatorios, or planesAlimentacion)
app.put('/api/patients/:id', async (req, res) => {
  try {
    const updated = await updatePatient(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Patient
app.delete('/api/patients/:id', async (req, res) => {
  try {
    const success = await deletePatient(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Global error handler to return JSON instead of HTML/text stack trace
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});


// INIT APP AND ATTACH MIDDLEWARES
async function startServer() {
  // Initialize Database Wrapper (also handled by middleware, but good to run eagerly on startup)
  await initDatabase();

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Soma running on http://0.0.0.0:${PORT}`);
  });
}

// Only run standalone server if not in Vercel serverless environment
if (!process.env.VERCEL) {
  startServer();
}

export default app;
