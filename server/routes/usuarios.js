import express from 'express';
import { supabase } from '../config/db.js';
import bcrypt from 'bcryptjs';
import { requireSesion } from '../middlewares/requireSesion.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';

const router = express.Router();

router.get('/', requireSesion, requireAdmin, async (req, res) => {
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
  const { nombre, email, password, sesion_id } = req.body;

  if (!nombre || !email || !password || !sesion_id) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const { data: existingUser, error: existErr } = await supabase
      .from('usuario')
      .select('id_usuario')
      .eq('email', email)
      .maybeSingle();

    if (existErr) throw existErr;

    if (existingUser) {
      return res.status(400).json({ error: 'Ya existe una cuenta con ese correo' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: userData, error: userError } = await supabase
      .from('usuario')
      .insert([{
        nombre,
        email,
        contraseña: hashedPassword,
        estado: true,
        fecha_registro: new Date(),
        sesion_id, // UUID de Supabase Auth
      }])
      .select()
      .single();

    if (userError) throw userError;

    const { data: clientData, error: clientError } = await supabase
      .from('cliente')
      .insert([{
        id_usuario: userData.id_usuario,
        tarjeta: null,
        subscripcion: null,
        estado: 'email_pendiente',
      }])
      .select()
      .single();

    if (clientError) throw clientError;

    const { error: perfilError } = await supabase
      .from('perfil')
      .insert([{
        id_cliente: clientData.id_cliente,
        biografia: '',
        skills: '',
        reputacion: 0,
        redes_sociales: null,
        foto_perfil: null,
      }]);

    if (perfilError) throw perfilError;

    return res.status(201).json({
      ok: true,
      message: 'Usuario registrado. Confirmá tu correo para iniciar sesión.',
    });

  } catch (err) {
    console.error('Error registrando usuario:', err);
    return res.status(500).json({ error: 'Error registrando usuario' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });

  try {
    const { data: users, error } = await supabase
      .from('usuario')
      .select()
      .eq('email', email);

    if (error) throw error;
    if (!users || users.length === 0)
      return res.status(400).json({ error: 'Usuario no encontrado' });

    const user = users[0];

    if (user.estado === false) {
      return res.status(403).json({ error: 'Esta cuenta está suspendida / baneada.' });
    }

    const valid = await bcrypt.compare(password, user.contraseña);
    if (!valid) return res.status(400).json({ error: 'Contraseña incorrecta' });

    const { data: clienteRows, error: clienteError } = await supabase
      .from('cliente')
      .select('id_cliente, estado')
      .eq('id_usuario', user.id_usuario);

    if (clienteError) throw clienteError;

    const cliente = clienteRows?.[0];

    if (cliente && cliente.estado === 'email_pendiente') {
      return res.status(403).json({
        error: 'Debés confirmar tu correo antes de iniciar sesión'
      });
    }

    const id_cliente = clienteRows && clienteRows.length > 0 ? clienteRows[0].id_cliente : null;

    const { data: adminRows, error: adminError } = await supabase
      .from('administrador')
      .select('id_admin, rol')
      .eq('id_usuario', user.id_usuario);

    if (adminError) throw adminError;

    const admin = adminRows && adminRows.length > 0 ? adminRows[0] : null;
    const es_admin = !!admin;

    res.json({
      usuario: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        email: user.email,
      },
      id_cliente,
      es_admin,
      admin: admin
        ? {
            id_admin: admin.id_admin,
            rol: admin.rol,
          }
        : null,
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en login' });
  }
});

router.put('/password', requireSesion, async (req, res) => {
  const id_usuario = req.userLocal.id_usuario;
  const { currPass, newPass } = req.body;

  if (!currPass || !newPass) {
    return res.status(400).json({ error: 'Faltan campos' });
  }

  const { data: user, error } = await supabase
    .from('usuario')
    .select('contraseña, sesion_id')
    .eq('id_usuario', id_usuario)
    .single();

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const valid = await bcrypt.compare(currPass, user.contraseña);
  if (!valid) {
    return res.status(400).json({ error: 'Contraseña actual incorrecta' });
  }

  const hashed = await bcrypt.hash(newPass, 10);

  await supabase
    .from('usuario')
    .update({ contraseña: hashed })
    .eq('id_usuario', id_usuario);

  await supabase.auth.admin.updateUserById(user.sesion_id, {
    password: newPass
  });

  res.json({ ok: true });
});

router.get('/by-cliente/', requireSesion, async (req, res) => {
  const id_cliente = req.cliente.id_cliente;

  try {
    const { data: cli, error: cliErr } = await supabase
      .from('cliente')
      .select('id_usuario')
      .eq('id_cliente', id_cliente)
      .single();

    if (cliErr) throw cliErr;
    if (!cli) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const { data: usr, error: usrErr } = await supabase
      .from('usuario')
      .select('id_usuario, nombre, email, estado, fecha_registro')
      .eq('id_usuario', cli.id_usuario)
      .single();

    if (usrErr) throw usrErr;
    if (!usr) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json(usr);
  } catch (err) {
    console.error('Error resolviendo usuario por cliente:', err);
    return res.status(500).json({ error: 'Error resolviendo usuario por cliente' });
  }
});

router.put('/me', requireSesion, async (req, res) => {
  const id_usuario = req.userLocal.id_usuario;
  const { nombre, email } = req.body;

  const updateData = {};
  if (nombre !== undefined) updateData.nombre = nombre;
  if (email !== undefined) updateData.email = email;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "Nada para actualizar" });
  }

  const { data, error } = await supabase
    .from('usuario')
    .update(updateData)
    .eq('id_usuario', id_usuario)
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Error actualizando usuario" });

  res.json(data);
});

router.put('/:id/estado', requireSesion, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  const { data, error } = await supabase
    .from('usuario')
    .update({ estado })
    .eq('id_usuario', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Error actualizando estado" });

  res.json(data);
});

router.post('/confirm-email', async (req, res) => {
  const { sesion_id } = req.body;
  
  try {
    const { data: user, error: userErr } = await supabase
      .from('usuario')
      .select('id_usuario')
      .eq('sesion_id', sesion_id)
      .single();

    if (userErr || !user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { error: updErr } = await supabase
      .from('cliente')
      .update({ estado: 'activo' })
      .eq('id_usuario', user.id_usuario)
      .select();

    if (updErr) throw updErr;

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error confirmando email' });
  }
});


export default router;
