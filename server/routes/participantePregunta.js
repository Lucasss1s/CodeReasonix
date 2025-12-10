import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

router.post('/:id/respond', async (req, res) => {
  const id_pp = Number(req.params.id);
  const { respuesta } = req.body;

  if (!['A','B','C','D'].includes(respuesta)) {
    return res.status(400).json({ error: 'Respuesta inválida' });
  }

  try {
    const { data: ppData, error: ppErr } = await supabase
      .from('participante_pregunta')
      .select('*')
      .eq('id_participante_pregunta', id_pp)
      .single();
    if (ppErr) throw ppErr;
    if (!ppData) return res.status(404).json({ error: 'Asignación no encontrada' });
    if (ppData.respondida) return res.status(400).json({ error: 'Esta pregunta ya fue respondida' });

    const { data: dp, error: dpErr } = await supabase
      .from('desafio_pregunta')
      .select('*')
      .eq('id_desafio_pregunta', ppData.id_desafio_pregunta)
      .single();
    if (dpErr) throw dpErr;

    const { data: preg, error: pregErr } = await supabase
      .from('pregunta')
      .select('*')
      .eq('id_pregunta', dp.id_pregunta)
      .single();
    if (pregErr) throw pregErr;

    const correcta = preg.correcta;
    const esCorrecta = (String(respuesta).toUpperCase() === String(correcta).toUpperCase());

    const puntosObtenidos = esCorrecta ? Number(dp.puntos || 0) : 0;
    const { data: updPP, error: updPPErr } = await supabase
      .from('participante_pregunta')
      .update({
        respuesta_enviada: respuesta,
        correcta: esCorrecta,
        respondida: true,
        puntos_obtenidos: puntosObtenidos
      })
      .eq('id_participante_pregunta', id_pp)
      .select()
      .single();
    if (updPPErr) throw updPPErr;

    const { data: partData, error: partErr } = await supabase
      .from('participante_desafio')
      .select('*')
      .eq('id_participante', ppData.id_participante)
      .single();
    if (partErr) throw partErr;

    const nuevoDano = Number(partData.dano_total || 0) + puntosObtenidos;
    const nuevasRespondidas = Number(partData.respondidas || 0) + 1;
    const nuevosAciertos = Number(partData.aciertos || 0) + (esCorrecta ? 1 : 0);

    const { data: updPart, error: updPartErr } = await supabase
      .from('participante_desafio')
      .update({
        dano_total: nuevoDano,
        respondidas: nuevasRespondidas,
        aciertos: nuevosAciertos
      })
      .eq('id_participante', ppData.id_participante)
      .select()
      .single();
    if (updPartErr) throw updPartErr;

    if (esCorrecta && puntosObtenidos > 0) {
      const { error: insPuntErr } = await supabase.from('puntuacion').insert([{
        id_cliente: partData.id_cliente,
        id_ranking: `desafio_${dp.id_desafio}`,
        puntos: puntosObtenidos,
        motivo: 'respuesta_correcta',
        fecha: new Date().toISOString()
      }]);
      if (insPuntErr) console.warn('No se pudo insertar en puntuacion:', insPuntErr.message);
    }

    const { data: desafioRow, error: desafioErr } = await supabase
      .from('desafio')
      .select('*')
      .eq('id_desafio', dp.id_desafio)
      .single();
    if (desafioErr) throw desafioErr;

    const currentHp = (desafioRow.hp_restante === null || desafioRow.hp_restante === undefined)
      ? Number(desafioRow.hp_total)
      : Number(desafioRow.hp_restante);
    let newHp = currentHp - puntosObtenidos;
    if (newHp < 0) newHp = 0;

    const { data: updatedDesafio, error: updDesErr } = await supabase
      .from('desafio')
      .update({ hp_restante: newHp })
      .eq('id_desafio', dp.id_desafio)
      .select()
      .single();
    if (updDesErr) throw updDesErr;

    let repartoIniciado = false;
    let finalizado = false;
    let ganadorId_cliente = null;

    if (newHp === 0 && desafioRow.estado === 'activo') {
      const { data: claimData, error: claimErr } = await supabase
        .from('desafio')
        .update({ estado: 'finalizado' })
        .eq('id_desafio', dp.id_desafio)
        .eq('estado', 'activo')
        .select()
        .single();

      if (claimErr) {
        console.warn('No se pudo marcar desafio como finalizado:', claimErr);
      } else {
        finalizado = true;
        ganadorId_cliente = partData.id_cliente || null;
      }
    }

    return res.json({
      message: 'Respuesta registrada',
      correcta: esCorrecta,
      puntos_obtenidos: puntosObtenidos,
      hp_restante: newHp,
      repartoIniciado,
      finalizado,
      ganadorId_cliente: ganadorId_cliente,
      respuesta_correcta: correcta
    });
  } catch (err) {
    console.error('Error procesando respuesta:', err);
    res.status(500).json({ error: 'Error procesando respuesta' });
  }
});

router.get('/por-participante/:id_participante', async (req, res) => {
  const id = Number(req.params.id_participante);
  try {
    const { data, error } = await supabase
      .from('participante_pregunta')
      .select('*, desafio_pregunta(id_desafio_pregunta, puntos, id_pregunta), participante_desafio(id_participante, id_cliente)')
      .eq('id_participante', id);
    if (error) throw error;

    const enriched = await Promise.all(
      data.map(async (row) => {
        const { data: preg } = await supabase
          .from('pregunta')
          .select('texto, opciones, correcta')   
          .eq('id_pregunta', row.desafio_pregunta.id_pregunta)
          .single();

        return { ...row, pregunta: preg };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('Error obteniendo preguntas por participante:', err);
    res.status(500).json({ error: 'Error obteniendo preguntas por participante' });
  }
});

export default router;
