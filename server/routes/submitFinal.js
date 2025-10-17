import express from 'express';
import { supabase } from '../config/db.js';
import { enviarCodigo } from '../utils/judge0.js';
import { otorgarXP, registrarActividadDiaria, otorgarXPUnaVezPorDia } from '../services/gamificacion.js';
import { obtenerDificultadEjercicio, xpPorDificultad, yaAceptadoEjercicio  } from '../services/ejercicio.js';

const router = express.Router();

router.post('/', async (req, res) => {
    const { id_cliente, id_ejercicio, codigo_fuente, lenguaje } = req.body;

    if (!id_cliente || !id_ejercicio || !codigo_fuente || !lenguaje) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    try {
        const { data: casos, error: errorCasos } = await supabase
            .from('caso_prueba')
            .select('id_caso, entrada_procesada, salida_esperada')
            .eq('id_ejercicio', id_ejercicio);

        if (errorCasos) throw errorCasos;

        const resultados = [];
        let tiempoMax = 0;  
        let memoriaMax = 0;

        for (const caso of casos) {
            // Reemplaza '{entrada}' por la entrada procesada x lenguaje
            const entradaProcesada = caso.entrada_procesada?.[lenguaje];
            const plantilla = codigo_fuente.replace('{entrada}', entradaProcesada);
            const resultado = await enviarCodigo(plantilla, lenguaje);

            const tiempoCaso = parseFloat(resultado.time || 0);
            tiempoMax = Math.max(tiempoMax, tiempoCaso); 

            memoriaMax = Math.max(memoriaMax, resultado.memory || 0);

            const salida_obtenida = resultado.stdout?.trim() ?? 'error';
            const aceptado = salida_obtenida === caso.salida_esperada;

            resultados.push({
                id_caso: caso.id_caso,
                entrada: caso.entrada_procesada,
                salida_esperada: caso.salida_esperada,
                salida_obtenida,
                resultado: aceptado ? 'aceptado' : 'rechazado',
                tiempo: resultado.time ?? null,
                memoria: resultado.memory ?? null
            });
        }

        const aceptado = resultados.every(r => r.resultado === 'aceptado');

        const { data: inserted, error: errorInsert } = await supabase
            .from('submit_final')
            .insert([{
                id_cliente,
                id_ejercicio,
                codigo_fuente,
                lenguaje,
                resultado: aceptado,
                tiempo_ejecucion: tiempoMax,
                memoria_usada: memoriaMax,
                detalles: resultados
            }])
            .select()
            .single();

        if (errorInsert) throw errorInsert;

        let recompensa = null;
        let recompensa_bonus = null;

        if (aceptado) {
            const lang = (lenguaje || "").trim().toLowerCase();
            const { data: row, error: selErr } = await supabase
                .from('usuario_ejercicio_resuelto')
                .select('lenguajes_resueltos')
                .eq('id_cliente', id_cliente)
                .eq('id_ejercicio', id_ejercicio)
                .single();

            if (selErr && selErr.code !== 'PGRST116') throw selErr;

            let recompensa = null;

            if (!row) {
                const difNum = await obtenerDificultadEjercicio(id_ejercicio); 
                const cantidad = xpPorDificultad(difNum);
                recompensa = await otorgarXP({
                id_cliente,
                cantidad,
                motivo: { tipo: 'submit', detalle: { id_ejercicio, dificultad: difNum, lenguaje: lang } }
                });

                await registrarActividadDiaria({
                id_cliente,
                tipo: "resolver_ejercicio",
                xpDelta: cantidad,
                incrementar: true
                });

                const { error: insErr } = await supabase
                .from('usuario_ejercicio_resuelto')
                .insert({
                    id_cliente,
                    id_ejercicio,
                    id_submit_final: inserted.id_submit_final,
                    lenguajes_resueltos: [lang]
                });
                if (insErr) throw insErr;

            } else {
                // Se resolvio antes: no dar xp ? agregamos al array 
                const yaTiene = Array.isArray(row.lenguajes_resueltos)
                ? row.lenguajes_resueltos.map(s => (s || '').toLowerCase())
                : [];
                if (!yaTiene.includes(lang)) {
                const nuevo = [...yaTiene, lang];

                const { error: upErr } = await supabase
                    .from('usuario_ejercicio_resuelto')
                    .update({ lenguajes_resueltos: nuevo })
                    .eq('id_cliente', id_cliente)
                    .eq('id_ejercicio', id_ejercicio);

                if (upErr) throw upErr;

                }
            }

            const recompensa_bonus = await otorgarXPUnaVezPorDia({
                id_cliente,
                tipoActividad: "primer_resuelto_dia",
                xp: 5,
                motivo: { tipo: "bonus_primer_resuelto_dia" }
            });
            if (recompensa_bonus?.otorgado) {
                await registrarActividadDiaria({
                id_cliente,
                tipo: "resolver_ejercicio",
                xpDelta: 5,
                incrementar: false 
                });
            }
            }


        res.json({
            mensaje: 'Submit Final procesado con Judge0',
            resultado: aceptado ? 'aceptado' : 'rechazado',
            tiempo_max: tiempoMax,
            memoria_max: memoriaMax,
            detalles: resultados,
            insert: inserted,
            recompensa, 
            recompensa_bonus  
        });

    } catch (err) {
        console.error('Error en submit-final:', err);
        res.status(500).json({ error: 'Error procesando submit-final' });
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('submit_final')
            .select('*')
            .eq('id_submit_final', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return res.status(404).json({ error: 'No encontrado' });
            throw error;
        }

        res.json(data);
    } catch (err) {
        console.error('Error GET submit-final/:id', err);
        res.status(500).json({ error: 'Error obteniendo submit-final' });
    }
});


router.get('/comparacion/:id_ejercicio', async (req, res) => {
    const { id_ejercicio } = req.params;

    try {
        const { data, error } = await supabase
            .from('submit_final')
            .select('detalles, memoria_usada')
            .eq('id_ejercicio', id_ejercicio);

        if (error) throw error;
        if (!data || data.length === 0)
            return res.json({ mejorTiempo: 0, promedioTiempo: 0, mejorMemoria: 0, promedioMemoria: 0 });

        const tiempos = data
            .map(r => {
                if (!Array.isArray(r.detalles)) return null;
                const maxCaso = r.detalles.reduce((max, c) => 
                    parseFloat(c.tiempo || 0) > parseFloat(max.tiempo || 0) ? c : max,
                    { tiempo: 0 }
                );
                return parseFloat(maxCaso.tiempo || 0);
            })
            .filter(t => t > 0);

        const memorias = data.map(r => r.memoria_usada).filter(m => m && m > 0);

        if (tiempos.length === 0)
            return res.json({ mejorTiempo: 0, promedioTiempo: 0, mejorMemoria: 0, promedioMemoria: 0 });

        const mejorTiempo = Math.min(...tiempos);
        const promedioTiempo = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;

        const mejorMemoria = Math.min(...memorias);
        const promedioMemoria = memorias.reduce((a, b) => a + b, 0) / memorias.length;

        res.json({
            mejorTiempo: parseFloat(mejorTiempo.toFixed(3)),
            promedioTiempo: parseFloat(promedioTiempo.toFixed(3)),
            mejorMemoria,
            promedioMemoria: Math.round(promedioMemoria)
        });
    } catch (err) {
        console.error('Error GET /submit-final/comparacion/:id_ejercicio', err);
        res.status(500).json({ error: 'Error obteniendo comparación global' });
    }
});


export default router;
