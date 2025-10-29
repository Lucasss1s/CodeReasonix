import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

// GET /inscripciones -> listar inscripciones (con torneo y cliente)
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('inscripcion')
      .select('id_inscripcion, id_torneo, id_cliente, fecha, torneo:torneo(id_torneo, nombre), cliente:cliente(id_cliente)')
      .order('fecha', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error listando inscripciones:', err);
    res.status(500).json({ error: 'Error listando inscripciones' });
  }
});

// GET /inscripciones/:id -> una inscripcion
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { data, error } = await supabase
      .from('inscripcion')
      .select('*')
      .eq('id_inscripcion', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo inscripcion:', err);
    res.status(404).json({ error: 'Inscripción no encontrada' });
  }
});

// GET /inscripciones/por-torneo/:id_torneo -> inscripciones de un torneo
router.get('/por-torneo/:id_torneo', async (req, res) => {
  const id_torneo = Number(req.params.id_torneo);
  if (!id_torneo) return res.status(400).json({ error: 'id_torneo es obligatorio' });

  try {
    const { data, error } = await supabase
      .from('inscripcion')
      .select('id_inscripcion, id_torneo, id_cliente, fecha, cliente:cliente(id_cliente)')
      .eq('id_torneo', id_torneo)
      .order('fecha', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo inscripciones por torneo:', err);
    res.status(500).json({ error: 'Error obteniendo inscripciones por torneo' });
  }
});

// POST /inscripciones -> crear inscripcion { id_torneo, id_cliente }
// Se guarda fecha = now() desde el backend para asegurar que sea la fecha actual
router.post('/', async (req, res) => {
  const { id_torneo, id_cliente } = req.body;
  if (!id_torneo || !id_cliente) {
    return res.status(400).json({ error: 'id_torneo e id_cliente son obligatorios' });
  }

  try {
    const idT = Number(id_torneo);
    const idC = Number(id_cliente);

    // Prevención de duplicados: comprobar si ya existe inscripción para ese par
    const { data: existing, error: exErr } = await supabase
      .from('inscripcion')
      .select('id_inscripcion')
      .eq('id_torneo', idT)
      .eq('id_cliente', idC)
      .limit(1);

    if (exErr) throw exErr;
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Ya estás inscrito en este torneo' });
    }

    const payload = {
      id_torneo: idT,
      id_cliente: idC,
      fecha: new Date().toISOString() // fecha actual enviada desde el server
    };

    const { data, error } = await supabase
      .from('inscripcion')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Error creando inscripcion:', err);
    res.status(500).json({ error: 'Error creando inscripcion' });
  }
});

// DELETE /inscripciones/:id -> eliminar inscripcion
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { error } = await supabase
      .from('inscripcion')
      .delete()
      .eq('id_inscripcion', id);
    if (error) throw error;
    res.json({ message: 'Inscripción eliminada correctamente' });
  } catch (err) {
    console.error('Error eliminando inscripcion:', err);
    res.status(500).json({ error: 'Error eliminando inscripcion' });
  }
});

export default router;
