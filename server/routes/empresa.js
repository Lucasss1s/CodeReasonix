import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

// GET /empresas?q=
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  try {
    let query = supabase.from('empresa').select('*').order('id_empresa', { ascending: true });
    if (q) query = query.ilike('nombre', `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error listando empresas:', err);
    res.status(500).json({ error: 'Error listando empresas' });
  }
});

// GET /empresas/:id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { data, error } = await supabase
      .from('empresa')
      .select('*')
      .eq('id_empresa', id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo empresa:', err);
    res.status(404).json({ error: 'Empresa no encontrada' });
  }
});

// POST /empresas
router.post('/', async (req, res) => {
  const { nombre, descripcion, sector } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    const { data, error } = await supabase
      .from('empresa')
      .insert([{ nombre, descripcion: descripcion ?? null, sector: sector ?? null }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Error creando empresa:', err);
    res.status(500).json({ error: 'Error creando empresa' });
  }
});

// PUT /empresas/:id
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { nombre, descripcion, sector } = req.body;

  try {
    const { data, error } = await supabase
      .from('empresa')
      .update({ nombre, descripcion, sector })
      .eq('id_empresa', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error actualizando empresa:', err);
    res.status(500).json({ error: 'Error actualizando empresa' });
  }
});

// DELETE /empresas/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { error } = await supabase.from('empresa').delete().eq('id_empresa', id);
    if (error) throw error;
    res.json({ message: 'Empresa eliminada correctamente' });
  } catch (err) {
    console.error('Error eliminando empresa:', err);
    res.status(500).json({ error: 'Error eliminando empresa' });
  }
});

export default router;
