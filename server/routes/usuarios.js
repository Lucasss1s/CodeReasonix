import express from 'express';
import { supabase } from '../config/db.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

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

router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data: userData, error: userError } = await supabase
      .from('usuario')
      .insert([
        {
          nombre,
          email,
          contraseña: hashedPassword,
          estado: true,
          fecha_registro: new Date()
        },
      ])
      .select()
      .single();

    if (userError) throw userError;

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

    const { data: perfilData, error: perfilError } = await supabase
      .from('perfil')
      .insert([
        {
          id_cliente: clientData.id_cliente,
          biografia: "",
          skills: "",
          nivel: 1,             
          reputacion: 0,        
          redes_sociales: null,
          foto_perfil: null
        },
      ])
      .select()
      .single();

    if (perfilError) throw perfilError;

    res.json({
      usuario: userData,
      cliente: clientData,
      perfil: perfilData,
      message: 'Usuario, cliente y perfil creados correctamente',
    });
  } catch (err) {
    console.error('Error registrando usuario y cliente:', err);
    res.status(500).json({ error: 'Error registrando usuario y cliente' });
  }
});

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

    const { data: cliente, error: clienteError } = await supabase
      .from('cliente')
      .select('id_cliente')
      .eq('id_usuario', user.id_usuario)
      .single();

    if (clienteError) throw clienteError;

    res.json({
      usuario: { id_usuario: user.id_usuario, nombre: user.nombre, email: user.email },
      id_cliente: cliente?.id_cliente ?? null
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en login' });
  }
});

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

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('usuario')
      .select('id_usuario, nombre, email, estado, fecha_registro')
      .eq('id_usuario', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo usuario:', err);
    res.status(500).json({ error: 'Error obteniendo usuario' });
  }
});

router.get('/by-cliente/:id_cliente', async (req, res) => {
  const { id_cliente } = req.params;
  try {
    const { data: cli, error: cliErr } = await supabase
      .from('cliente')
      .select('id_usuario')
      .eq('id_cliente', id_cliente)
      .single();
    if (cliErr) throw cliErr;
    if (!cli) return res.status(404).json({ error: 'Cliente no encontrado' });

    const { data: usr, error: usrErr } = await supabase
      .from('usuario')
      .select('id_usuario, nombre, email, estado, fecha_registro')
      .eq('id_usuario', cli.id_usuario)
      .single();
    if (usrErr) throw usrErr;
    if (!usr) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json(usr);
  } catch (err) {
    console.error('Error resolviendo usuario por cliente:', err);
    res.status(500).json({ error: 'Error resolviendo usuario por cliente' });
  }
});


export default router;
