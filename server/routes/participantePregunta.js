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

    const currentHp = (desafioRow.hp_restante === null || desafioRow.hp_restante === undefined) ? Number(desafioRow.hp_total) : Number(desafioRow.hp_restante);
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
      ganadorId_cliente = partData.id_cliente || null;

      const { data: claimData, error: claimErr } = await supabase
        .from('desafio')
        .update({ estado: 'finalizando' })
        .eq('id_desafio', dp.id_desafio)
        .eq('estado', 'activo')
        .select()
        .single();

      if (!claimErr && claimData) {
        repartoIniciado = true;
        try {
          const { data: participants, error: partListErr } = await supabase
            .from('participante_desafio')
            .select('*')
            .eq('id_desafio', dp.id_desafio);
          if (partListErr) throw partListErr;

          const xpGiven = Number(desafioRow.recompensa_xp || 0);
          const monedaGiven = Number(desafioRow.recompensa_moneda || 0);

          for (const p of participants) {
            const { error: updRecErr } = await supabase
              .from('participante_desafio')
              .update({ recibio_recompensa: true })
              .eq('id_participante', p.id_participante);
            if (updRecErr) console.warn('Error marcando recibio_recompensa:', updRecErr.message);

            const { data: ux, error: uxErr } = await supabase
              .from('usuario_xp')
              .select('*')
              .eq('id_cliente', p.id_cliente)
              .single();

            if (uxErr && uxErr.code === 'PGRST116') {
              const { error: insUxErr } = await supabase.from('usuario_xp').insert([{
                id_cliente: p.id_cliente,
                xp_total: xpGiven,
                nivel: 1,
                ultima_actualizacion: new Date().toISOString()
              }]);
              if (insUxErr) console.warn('Error insertando usuario_xp:', insUxErr.message);
            } else if (!uxErr) {
              const nuevoXp = Number(ux.xp_total || 0) + xpGiven;
              const nuevoNivel = 1 + Math.floor(nuevoXp / 200);
              const { error: updUxErr } = await supabase.from('usuario_xp').update({
                xp_total: nuevoXp,
                nivel: nuevoNivel,
                ultima_actualizacion: new Date().toISOString()
              }).eq('id_cliente', p.id_cliente);
              if (updUxErr) console.warn('Error actualizando usuario_xp:', updUxErr.message);
            } else {
              console.warn('Error leyendo usuario_xp:', uxErr.message);
            }

            const logs = [];
            if (xpGiven > 0) logs.push({
              id_cliente: p.id_cliente,
              id_ranking: `desafio_${dp.id_desafio}`,
              puntos: xpGiven,
              motivo: 'derrota_boss_xp',
              fecha: new Date().toISOString()
            });
            if (monedaGiven > 0) logs.push({
              id_cliente: p.id_cliente,
              id_ranking: `desafio_${dp.id_desafio}`,
              puntos: monedaGiven,
              motivo: 'derrota_boss_moneda',
              fecha: new Date().toISOString()
            });
            if (logs.length) {
              const { error: insLogsErr } = await supabase.from('puntuacion').insert(logs);
              if (insLogsErr) console.warn('Error insertando logs de recompensa:', insLogsErr.message);
            }
          } 

          const { error: finalErr } = await supabase.from('desafio').update({ estado: 'finalizado' }).eq('id_desafio', dp.id_desafio);
          if (finalErr) console.warn('Error finalizando desafio:', finalErr.message);

          finalizado = true;

        } catch (reErr) {
          console.error('Error repartiendo recompensas:', reErr);
          await supabase.from('desafio').update({ estado: 'finalizado' }).eq('id_desafio', dp.id_desafio);
          finalizado = true;
        }
      }
    }

    return res.json({
      message: 'Respuesta registrada',
      correcta: esCorrecta,
      puntos_obtenidos: puntosObtenidos,
      hp_restante: newHp,
      repartoIniciado,
      finalizado,
      ganadorId_cliente: ganadorId_cliente
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
    const enriched = await Promise.all(data.map(async (row) => {
      const { data: preg } = await supabase.from('pregunta').select('texto, opciones').eq('id_pregunta', row.desafio_pregunta.id_pregunta).single();
      return { ...row, pregunta: preg };
    }));
    res.json(enriched);
  } catch (err) {
    console.error('Error obteniendo preguntas por participante:', err);
    res.status(500).json({ error: 'Error obteniendo preguntas por participante' });
  }
});

export default router;
