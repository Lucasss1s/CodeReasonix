import express from 'express';
import { supabase } from '../config/db.js';
import { requireSesion } from "../middlewares/requireSesion.js";

const router = express.Router();

const ESTADOS_VALIDOS = ['pendiente', 'en_revision', 'aceptada', 'rechazada'];

router.get('/', requireSesion, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('postulacion')
      .select(`
        id_postulacion,
        id_oferta,
        id_cliente,
        fecha,
        estado,
        oferta:oferta_laboral(id_oferta, titulo),
        cliente:cliente(id_cliente)
      `)
      .order('fecha', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error listando postulaciones:', err);
    res.status(500).json({ error: 'Error listando postulaciones' });
  }
});

router.get('/mias', requireSesion, async (req, res) => {
  const id_cliente = req.cliente.id_cliente;
  if (!id_cliente) return res.status(400).json({ error: 'id_cliente es obligatorio' });

  try {
    const { data, error } = await supabase
      .from('postulacion')
      .select(`
        id_postulacion,
        id_oferta,
        id_cliente,
        fecha,
        estado,
        oferta:oferta_laboral(id_oferta, titulo)
      `)
      .eq('id_cliente', id_cliente)
      .order('fecha', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo postulaciones del cliente:', err);
    res.status(500).json({ error: 'Error obteniendo postulaciones del cliente' });
  }
});

router.get('/por-oferta/:id_oferta', requireSesion, async (req, res) => {
  const id_oferta = Number(req.params.id_oferta);
  if (!id_oferta) return res.status(400).json({ error: 'id_oferta es obligatorio' });

  try {
    const { data, error } = await supabase
      .from('postulacion')
      .select(`
        id_postulacion,
        id_oferta,
        id_cliente,
        fecha,
        estado,
        cliente:cliente(id_cliente)
      `)
      .eq('id_oferta', id_oferta)
      .order('fecha', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo postulaciones por oferta:', err);
    res.status(500).json({ error: 'Error obteniendo postulaciones por oferta' });
  }
});

router.post('/', requireSesion, async (req, res) => {
  const id_cliente = req.cliente.id_cliente;
  const { id_oferta } = req.body;
  let { estado } = req.body;

  if (!id_oferta || !id_cliente) {
    return res.status(400).json({ error: 'id_oferta e id_cliente son obligatorios' });
  }

  if (!estado) estado = 'pendiente';
  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: `estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}` });
  }

  try {
    const payload = {
      id_oferta: Number(id_oferta),
      id_cliente: Number(id_cliente),
      estado 
    };

    const { data, error } = await supabase
      .from('postulacion')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Error creando postulacion:', err);
    res.status(500).json({ error: 'Error creando postulacion' });
  }
});

router.patch('/:id_postulacion', requireSesion, async (req, res) => {
  const id_postulacion = Number(req.params.id_postulacion);
  const { estado } = req.body;

  if (!id_postulacion || !estado) {
    return res.status(400).json({ error: 'id_postulacion y estado son obligatorios' });
  }
  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: `estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}` });
  }

  try {
    const { data, error } = await supabase
      .from('postulacion')
      .update({ estado })
      .eq('id_postulacion', id_postulacion)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error actualizando estado de postulacion:', err);
    res.status(500).json({ error: 'Error actualizando estado de postulacion' });
  }
});

router.delete('/:id_postulacion', requireSesion, async (req, res) => {
  const id_postulacion = Number(req.params.id_postulacion);
  if (!id_postulacion) return res.status(400).json({ error: 'id_postulacion es obligatorio' });

  try {
    const { error } = await supabase
      .from('postulacion')
      .delete()
      .eq('id_postulacion', id_postulacion);

    if (error) throw error;
    res.json({ message: 'Postulación eliminada correctamente' });
  } catch (err) {
    console.error('Error eliminando postulacion:', err);
    res.status(500).json({ error: 'Error eliminando postulacion' });
  }
});

export default router;
