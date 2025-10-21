import { supabase } from "../config/db.js";
import { otorgarXP, registrarActividadDiaria } from "./gamificacion.js";

export async function actualizarStreak(id_cliente, hoy = new Date()) {
    const today = new Date(hoy);
    const yyyy_mm_dd = today.toISOString().slice(0, 10);

    const { data: row, error: selErr } = await supabase
        .from("usuario_streak")
        .select("*")
        .eq("id_cliente", id_cliente)
        .single();
    if (selErr && selErr.code !== "PGRST116") throw selErr;

    if (!row) {
        const { error: insErr } = await supabase.from("usuario_streak").upsert({
        id_cliente,
        streak_actual: 1,
        streak_max: 1,
        ultima_fecha: yyyy_mm_dd,
        });
        if (insErr) throw insErr;
        return { otorga: false, streak: 1, streak_max: 1, xp: 0 };
    }

    const last = new Date(row.ultima_fecha);
    const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return {
        otorga: false,
        streak: row.streak_actual,
        streak_max: row.streak_max,
        xp: 0,
        };
    }

    let streak = 1;
    if (diffDays === 1) {
        streak = (row.streak_actual || 0) + 1;
    } else {
        streak = 1;
    }
    const streakMax = Math.max(row.streak_max || 0, streak);

    const { error: upErr } = await supabase
        .from("usuario_streak")
        .upsert({
        id_cliente,
        streak_actual: streak,
        streak_max: streakMax,
        ultima_fecha: yyyy_mm_dd,
        }, { onConflict: "id_cliente" });
    if (upErr) throw upErr;

    const xp = Math.min(Math.max(streak - 1, 0), 15);

    if (xp <= 0) {
        return { otorga: false, streak, streak_max: streakMax, xp: 0 };
    }

    await otorgarXP({
        id_cliente,
        cantidad: xp,
        motivo: { tipo: "streak", fecha: yyyy_mm_dd, streak },
    });
    await registrarActividadDiaria({
        id_cliente,
        tipo: "streak",
        xpDelta: xp,
        incrementar: false,
    });

    return { otorga: true, streak, streak_max: streakMax, xp };
}
