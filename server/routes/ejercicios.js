import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

// Helper 
async function ensureEtiquetas(etiquetas = []) {
    if (!Array.isArray(etiquetas) || etiquetas.length === 0) return [];
    const trimmed = etiquetas.map(t => t.trim()).filter(Boolean);
    if (trimmed.length === 0) return [];

    const { data: existentes, error: errEx } = await supabase
        .from('etiqueta')
        .select('id_etiqueta, nombre')
        .in('nombre', trimmed);

    if (errEx) throw errEx;

    const existentesMap = new Map((existentes || []).map(r => [r.nombre, r.id_etiqueta]));
    const toCreate = trimmed.filter(t => !existentesMap.has(t));

    let created = [];
    if (toCreate.length) {
        const { data: ins, error: errIns } = await supabase
        .from('etiqueta')
        .insert(toCreate.map(n => ({ nombre: n })))
        .select();
        if (errIns) throw errIns;
        created = ins || [];
    }

    const all = [...(existentes || []), ...created];
    return all.map(a => a.id_etiqueta);
}

router.get('/', async (req, res) => {
    const isAdmin = String(req.query.admin || '') === '1';
    try {
        let q = supabase.from('ejercicio').select('id_ejercicio, titulo, descripcion, dificultad, disabled, plantillas');
        if (!isAdmin) q = q.eq('disabled', false);
        const { data: ejerciciosData, error: errorEj } = await q.order('id_ejercicio', { ascending: true });

        if (errorEj) throw errorEj;

        const { data: relData, error: errorRel } = await supabase
        .from('ejercicio_etiqueta')
        .select('id_ejercicio, id_etiqueta');

        if (errorRel) throw errorRel;

        const { data: etiquetasData, error: errorEt } = await supabase
        .from('etiqueta')
        .select('id_etiqueta, nombre');

        if (errorEt) throw errorEt;

        const etiquetasById = new Map((etiquetasData || []).map(r => [r.id_etiqueta, r.nombre]));
        const etiquetasPorEjercicio = {};
        (relData || []).forEach((row) => {
        const { id_ejercicio, id_etiqueta } = row;
        const nombre = etiquetasById.get(id_etiqueta);
        if (!nombre) return;
        if (!etiquetasPorEjercicio[id_ejercicio]) etiquetasPorEjercicio[id_ejercicio] = [];
        etiquetasPorEjercicio[id_ejercicio].push(nombre);
        });

        const ejercicios = (ejerciciosData || []).map((ej) => {
        const rawTags = etiquetasPorEjercicio[ej.id_ejercicio] || [];
        const etiquetas = [...new Set(rawTags)];
        return { ...ej, etiquetas };
        });

        res.json(ejercicios);
    } catch (err) {
        console.error('Error listando ejercicios:', err);
        res.status(500).json({ error: 'Error listando ejercicios' });
    }
});

// Detalle ejercicio con casos de prueba
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const isAdmin = String(req.query.admin || '') === '1';

    try {
        let query = supabase
        .from('ejercicio')
        .select('id_ejercicio, titulo, descripcion, dificultad, plantillas, disabled')
        .eq('id_ejercicio', id);

        if (!isAdmin) query = query.eq('disabled', false);

        const { data: ejercicio, error: errorEjercicio } = await query.maybeSingle();

        if (errorEjercicio) throw errorEjercicio;
        if (!ejercicio) return res.status(404).json({ error: 'Ejercicio no encontrado' });

        // etiquetas
        const { data: rels, error: errorRels } = await supabase
        .from('ejercicio_etiqueta')
        .select('id_etiqueta')
        .eq('id_ejercicio', id);

        if (errorRels) throw errorRels;

        let etiquetas = [];
        if (rels && rels.length > 0) {
        const ids = rels.map((r) => r.id_etiqueta);
        const { data: tags, error: errorTags } = await supabase
            .from('etiqueta')
            .select('id_etiqueta, nombre')
            .in('id_etiqueta', ids);

        if (errorTags) throw errorTags;
        etiquetas = (tags || []).map((t) => t.nombre);
        }

        let casosQ = supabase
        .from('caso_prueba')
        .select('id_caso, entrada_procesada, salida_esperada, publico')
        .eq('id_ejercicio', id);
        if (!isAdmin) casosQ = casosQ.eq('publico', true);

        const { data: casos, error: errorCasos } = await casosQ;
        if (errorCasos) throw errorCasos;

        // pistas 
        const { data: pistas, error: errP } = await supabase
        .from('ejercicio_pista')
        .select('id_pista,id_ejercicio,titulo,contenido,orden')
        .eq('id_ejercicio', id)
        .order('orden', { ascending: true });
        if (errP) throw errP;

        res.json({ ...ejercicio, etiquetas, casos_prueba: casos || [], pistas: pistas || [] });
    } catch (err) {
        console.error('Error obteniendo ejercicio:', err);
        res.status(500).json({ error: 'Error obteniendo ejercicio' });
    }
    });


router.post('/', async (req, res) => {
    const { titulo, descripcion, dificultad = 1, plantillas = {}, etiquetas = [], disabled = false } = req.body || {};
    if (!titulo || !descripcion) return res.status(400).json({ error: 'titulo y descripcion son obligatorios' });

    try {
        const { data: inserted, error: errorInsert } = await supabase
        .from('ejercicio')
        .insert([{ titulo, descripcion, dificultad, plantillas, disabled }])
        .select()
        .single();
        if (errorInsert) throw errorInsert;

        const etiquetaIds = await ensureEtiquetas(etiquetas);
        if (etiquetaIds.length) {
        const rels = etiquetaIds.map(id_etiqueta => ({ id_ejercicio: inserted.id_ejercicio, id_etiqueta }));
        const { error: relErr } = await supabase.from('ejercicio_etiqueta').insert(rels);
        if (relErr) console.warn('No se pudieron crear relaciones etiquetas:', relErr);
        }

        res.json({ ok: true, ejercicio: inserted });
    } catch (err) {
        console.error('Error creando ejercicio:', err);
        res.status(500).json({ error: 'Error creando ejercicio' });
    }
});


router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { titulo, descripcion, dificultad, plantillas, etiquetas, disabled } = req.body || {};

    try {
        const updates = {};
        if (titulo !== undefined) updates.titulo = titulo;
        if (descripcion !== undefined) updates.descripcion = descripcion;
        if (dificultad !== undefined) updates.dificultad = dificultad;
        if (plantillas !== undefined) updates.plantillas = plantillas;
        if (disabled !== undefined) updates.disabled = disabled;

        const { data: updated, error: errUp } = await supabase
        .from('ejercicio')
        .update(updates)
        .eq('id_ejercicio', id)
        .select()
        .maybeSingle();
        if (errUp) throw errUp;

        if (Array.isArray(etiquetas)) {
        const { error: delRelErr } = await supabase.from('ejercicio_etiqueta').delete().eq('id_ejercicio', id);
        if (delRelErr) console.warn('No se pudieron borrar relaciones (continuando):', delRelErr);
        const etiquetaIds = await ensureEtiquetas(etiquetas);
        if (etiquetaIds.length) {
            const rels = etiquetaIds.map(id_etiqueta => ({ id_ejercicio: Number(id), id_etiqueta }));
            const { error: insRelErr } = await supabase.from('ejercicio_etiqueta').insert(rels);
            if (insRelErr) console.warn('No se pudieron insertar relaciones etiquetas:', insRelErr);
        }
        }

        res.json({ ok: true, ejercicio: updated });
    } catch (err) {
        console.error('Error actualizando ejercicio:', err);
        res.status(500).json({ error: 'Error actualizando ejercicio' });
    }
});

export default router;
