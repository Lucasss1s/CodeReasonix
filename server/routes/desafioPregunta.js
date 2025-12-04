import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

function sonCompatiblesCampo(valorDesafio, valorPregunta) {
  if (valorDesafio == null || valorPregunta == null) return true;
  return String(valorDesafio) === String(valorPregunta);
}

router.get('/', async (req, res) => {
  try {
    const { desafio } = req.query;
    let q = supabase.from('desafio_pregunta').select('*, pregunta(*)');
    if (desafio) q = q.eq('id_desafio', Number(desafio));
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error listando desafio_pregunta:', err);
    res.status(500).json({ error: 'Error listando desafío_pregunta' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id_desafio, id_pregunta, puntos } = req.body;
    if (!id_desafio || !id_pregunta) {
      return res
        .status(400)
        .json({ error: 'id_desafio e id_pregunta son obligatorios' });
    }

    const idDes = Number(id_desafio);
    const idPreg = Number(id_pregunta);
    if (Number.isNaN(idDes) || Number.isNaN(idPreg)) {
      return res
        .status(400)
        .json({ error: 'id_desafio e id_pregunta deben ser números' });
    }

    const { data: existing, error: existingErr } = await supabase
      .from('desafio_pregunta')
      .select('*')
      .eq('id_desafio', idDes)
      .eq('id_pregunta', idPreg)
      .maybeSingle();

    if (existingErr && existingErr.code && existingErr.code !== 'PGRST116') {
      console.error('Error chequeando existencia de desafio_pregunta:', existingErr);
      return res
        .status(500)
        .json({ error: 'Error chequeando desafio_pregunta existente' });
    }

    if (existing) {
      return res.status(200).json(existing);
    }

    const { data: desafioRow, error: desErr } = await supabase
      .from('desafio')
      .select('id_desafio, lenguaje, dificultad')
      .eq('id_desafio', idDes)
      .single();
    if (desErr) {
      console.error('Error buscando desafio:', desErr);
      return res.status(404).json({ error: 'Desafío no encontrado' });
    }

    const { data: pregRow, error: pregErr } = await supabase
      .from('pregunta')
      .select('id_pregunta, lenguaje, dificultad')
      .eq('id_pregunta', idPreg)
      .single();
    if (pregErr) {
      console.error('Error buscando pregunta:', pregErr);
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    if (!sonCompatiblesCampo(desafioRow.lenguaje, pregRow.lenguaje)) {
      return res.status(400).json({
        error: 'El lenguaje de la pregunta no coincide con el lenguaje del desafío',
      });
    }
    if (!sonCompatiblesCampo(desafioRow.dificultad, pregRow.dificultad)) {
      return res.status(400).json({
        error: 'La dificultad de la pregunta no coincide con la dificultad del desafío',
      });
    }

    const payload = {
      id_desafio: idDes,
      id_pregunta: idPreg,
      puntos: puntos != null ? Number(puntos) : 10,
    };

    const { data, error } = await supabase
      .from('desafio_pregunta')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Error creando desafio_pregunta:', err);
    res.status(500).json({ error: 'Error creando desafio_pregunta' });
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'id_desafio_pregunta inválido' });
  }

  try {
    const { puntos } = req.body;
    if (puntos == null) {
      return res
        .status(400)
        .json({ error: 'puntos es obligatorio para actualizar' });
    }

    const valor = Number(puntos);
    if (Number.isNaN(valor)) {
      return res.status(400).json({ error: 'puntos debe ser numérico' });
    }

    const { data, error } = await supabase
      .from('desafio_pregunta')
      .update({ puntos: valor })
      .eq('id_desafio_pregunta', id)
      .select()
      .single();
    if (error) {
      console.error('Supabase error al actualizar puntos desafio_pregunta:', error);
      throw error;
    }
    res.json(data);
  } catch (err) {
    console.error('Error actualizando desafio_pregunta:', err);
    res.status(500).json({ error: 'Error actualizando desafio_pregunta' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: 'id_desafio_pregunta inválido' });
  }

  try {
    console.log('Intentando borrar desafio_pregunta con id:', id);

    const { data: usados, error: usadosErr } = await supabase
      .from('participante_pregunta')
      .select('id_participante_pregunta')
      .eq('id_desafio_pregunta', id)
      .limit(1);

    if (usadosErr) {
      console.error(
        'Error chequeando uso en participante_pregunta:',
        usadosErr
      );
      return res.status(500).json({
        error: 'Error verificando uso de la asignación en participantes',
      });
    }

    if (usados && usados.length > 0) {
      return res.status(400).json({
        error:
          'No se puede eliminar esta asignación porque ya tiene respuestas de participantes.',
      });
    }

    const { error } = await supabase
      .from('desafio_pregunta')
      .delete()
      .eq('id_desafio_pregunta', id);

    if (error) {
      console.error('Supabase error al eliminar desafio_pregunta:', error);
      return res
        .status(500)
        .json({ error: error.message || 'Error eliminando desafio_pregunta' });
    }

    res.json({ message: 'Asociación pregunta-desafío eliminada' });
  } catch (err) {
    console.error('Error eliminando desafio_pregunta (catch general):', err);
    res.status(500).json({ error: 'Error eliminando desafio_pregunta' });
  }
});

export default router;
