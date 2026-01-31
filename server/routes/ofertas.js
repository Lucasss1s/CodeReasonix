import express from 'express';
import { supabase } from '../config/db.js';
import { requireSesion } from '../middlewares/requireSesion.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';

const router = express.Router();

router.get('/', requireSesion, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('oferta_laboral')
      .select('*, empresa:empresa(id_empresa, nombre, sector)')
      .order('fecha_publicacion', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo ofertas laborales:', err);
    res.status(500).json({ error: 'Error obteniendo ofertas laborales' });
  }
});

router.get('/:id', requireSesion, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { data, error } = await supabase
      .from('oferta_laboral')
      .select('*, empresa:empresa(id_empresa, nombre, sector)')
      .eq('id_oferta', id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo oferta:', err);
    res.status(404).json({ error: 'Oferta no encontrada' });
  }
});

router.post('/', requireSesion, requireAdmin, async (req, res) => {
  const { id_empresa, titulo, descripcion, ubicacion, requisitos, fecha_publicacion } = req.body;
  try {
    const insertPayload = {
      id_empresa: Number(id_empresa),
      titulo,
      descripcion: descripcion ?? null,
      ubicacion: ubicacion ?? null,
      requisitos: requisitos ?? null,
      fecha_publicacion: fecha_publicacion ?? new Date()
    };

    const { data, error } = await supabase
      .from('oferta_laboral')
      .insert([insertPayload])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Error creando oferta:', err);
    res.status(500).json({ error: 'Error creando oferta' });
  }
});

router.put('/:id', requireSesion, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { id_empresa, titulo, descripcion, ubicacion, requisitos, fecha_publicacion } = req.body;

  try {
    const { data, error } = await supabase
      .from('oferta_laboral')
      .update({ id_empresa, titulo, descripcion, ubicacion, requisitos, fecha_publicacion })
      .eq('id_oferta', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error actualizando oferta:', err);
    res.status(500).json({ error: 'Error actualizando oferta' });
  }
});

router.delete('/:id', requireSesion, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { error } = await supabase.from('oferta_laboral').delete().eq('id_oferta', id);
    if (error) throw error;
    res.json({ message: 'Oferta eliminada correctamente' });
  } catch (err) {
    console.error('Error eliminando oferta:', err);
    res.status(500).json({ error: 'Error eliminando oferta' });
  }
});

export default router;
