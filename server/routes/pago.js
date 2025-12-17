import express from "express";
import { supabase } from "../config/db.js";
import { requireSesion } from "../middlewares/requireSesion.js";

const router = express.Router();

/* Espera pago */
async function activarSuscripcionDesdePago(id_cliente) {
    const ahora = new Date();

    const { data: last, error } = await supabase
        .from("suscripcion")
        .select("*")
        .eq("id_cliente", id_cliente)
        .order("creado_en", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;

    const periodoFin = (() => {
        const p = new Date();
        p.setDate(p.getDate() + 30);
        return p;
    })();

    // Si existe suscription, no duplicar
    if (last && last.periodo_fin && new Date(last.periodo_fin) > ahora) {
        return last;
    }

    if (last) {
        const { data: updated, error: upErr } = await supabase
        .from("suscripcion")
        .update({
            estado: "activo",
            periodo_fin: periodoFin,
            auto_renew: true,
            cancelado_en: null,
            actualizado_en: new Date()
        })
        .eq("id_suscripcion", last.id_suscripcion)
        .select()
        .single();

        if (upErr) throw upErr;
        return updated;
    }

    const { data: inserted, error: insErr } = await supabase
        .from("suscripcion")
        .insert([{
        id_cliente,
        estado: "activo",
        periodo_fin: periodoFin,
        auto_renew: true,
        creado_en: new Date(),
        actualizado_en: new Date()
        }])
        .select()
        .single();

    if (insErr) throw insErr;
    return inserted;
}


router.post("/create", requireSesion, async (req, res) => {
    try {
        const id_cliente = req.cliente?.id_cliente;
        if (!id_cliente) {
        return res.status(400).json({ error: "Cliente no encontrado" });
        }

        const { monto, moneda = "ARS" } = req.body;
        if (!monto) {
        return res.status(400).json({ error: "Monto requerido" });
        }

        const { data: pago, error } = await supabase
        .from("pago")
        .insert([{
            id_cliente,
            monto,
            moneda,
            estado: "pending",
            proveedor: "manual",
            creado_en: new Date(),
            actualizado_en: new Date()
        }])
        .select()
        .single();

        if (error) throw error;

        res.status(201).json({ pago });
    } catch (err) {
        console.error("POST /pagos/create error:", err);
        res.status(500).json({ error: "Error creando pago" });
    }
});


router.post("/:id/confirm", requireSesion, async (req, res) => {
    try {
        const { id } = req.params;
        const { card_number } = req.body;

        const { data: pago, error } = await supabase
        .from("pago")
        .select("*")
        .eq("id_pago", id)
        .single();

        if (error || !pago) {
        return res.status(404).json({ error: "Pago no encontrado" });
        }

        if (pago.estado !== "pending") {
        return res.status(400).json({ error: "El pago ya fue procesado" });
        }

        const rejected = card_number?.endsWith("0000");

        const nuevoEstado = rejected ? "rejected" : "approved";

        const { data: updatedPago, error: upErr } = await supabase
        .from("pago")
        .update({
            estado: nuevoEstado,
            actualizado_en: new Date()
        })
        .eq("id_pago", id)
        .select()
        .single();

        if (upErr) throw upErr;

        if (nuevoEstado === "rejected") {
        return res.json({ pago: updatedPago });
        }

        const suscripcion = await activarSuscripcionDesdePago(pago.id_cliente);

        res.json({
        pago: updatedPago,
        suscripcion
        });

    } catch (err) {
        console.error("POST /pagos/:id/confirm error:", err);
        res.status(500).json({ error: "Error confirmando pago" });
    }
});


router.get("/mi", requireSesion, async (req, res) => {
    try {
        const id_cliente = req.cliente?.id_cliente;
        if (!id_cliente) {
        return res.status(400).json({ error: "Cliente no encontrado" });
        }

        const { data, error } = await supabase
        .from("pago")
        .select("*")
        .eq("id_cliente", id_cliente)
        .order("creado_en", { ascending: false });

        if (error) throw error;

        res.json({ pagos: data });
    } catch (err) {
        console.error("GET /pagos/mi error:", err);
        res.status(500).json({ error: "Error obteniendo pagos" });
    }
});


export default router;
