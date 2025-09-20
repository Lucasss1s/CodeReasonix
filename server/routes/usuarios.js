import express from 'express';
import { supabase } from '../config/db.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// 🔹 Obtener todos los usuarios (solo administración)
router.get('/', async (req, res) => {
  try {
    const { data: usuarios, error } = await supabase
      .from('usuario')
      .select('id_usuario, nombre, email, estado');

    if (error) throw error;
    res.json(usuarios);
  } catch (err) {
    console.error('Error obteniendo usuarios:', err);
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

// 🔹 Registro (guarda en tabla usuario y cliente con contraseña hasheada)
router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1️⃣ Insertar en la tabla usuario
    const { data: userData, error: userError } = await supabase
      .from('usuario')
      .insert([
        {
          nombre,
          email,
          contraseña: hashedPassword,
          estado: true, // usuario activo
          fecha_registro: new Date()
        },
      ])
      .select()
      .single(); // devuelve solo un usuario

    if (userError) throw userError;

    // 2️⃣ Insertar en la tabla cliente con el id_usuario creado
    const { data: clientData, error: clientError } = await supabase
      .from('cliente')
      .insert([
        {
          id_usuario: userData.id_usuario,
          tarjeta: null,
          subscripcion: null,
        },
      ])
      .select()
      .single();

    if (clientError) throw clientError;

    res.json({
      usuario: userData,
      cliente: clientData,
      message: 'Usuario y cliente creados correctamente',
    });
  } catch (err) {
    console.error('Error registrando usuario y cliente:', err);
    res.status(500).json({ error: 'Error registrando usuario y cliente' });
  }
});


// 🔹 Login (verifica email + contraseña)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son obligatorios' });

  try {
    const { data: users, error } = await supabase.from('usuario').select().eq('email', email);
    if (error) throw error;
    if (users.length === 0) return res.status(400).json({ error: 'Usuario no encontrado' });

    const user = users[0];

    const valid = await bcrypt.compare(password, user.contraseña);
    if (!valid) return res.status(400).json({ error: 'Contraseña incorrecta' });

    res.json({ usuario: { id_usuario: user.id_usuario, nombre: user.nombre, email: user.email } });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en login' });
  }
});

// 🔹 Actualizar usuario
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, email, estado, password } = req.body;

  try {
    let updateData = { nombre, email, estado };
    if (password) updateData.contraseña = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('usuario')
      .update(updateData)
      .eq('id_usuario', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

// 🔹 Eliminar usuario
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase.from('usuario').delete().eq('id_usuario', id);
    if (error) throw error;
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

export default router;
