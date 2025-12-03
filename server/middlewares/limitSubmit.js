import Redis from "ioredis";
import { supabase } from "../config/db.js";

const REDIS_URL = process.env.REDIS_URL || null;
let redis = null;
if (REDIS_URL) {
    try {
        redis = new Redis(REDIS_URL);
        redis.on("error", (e) => console.error("[redis] error:", e));
        redis.on("connect", () => console.info("[redis] connected"));
    } catch (e) {
        console.error("[redis] error:", e);
        redis = null;
    }
} else {
    console.info("[limitSubmit] REDIS_URL no seteado");
}

const LIMITS = {
    free: 5,
    premium: Number.POSITIVE_INFINITY
};

const INMEM = {
  store: new Map(), //{count, expiresAt}
};

function getTodayKey(id_cliente) {
    const today = new Date().toISOString().slice(0,10);
    return `submits:${id_cliente}:${today}`;
}

async function incrRedis(key, expireSec) {
    const val = await redis.incr(key);
    if (val === 1) await redis.expire(key, expireSec);
    return val;
}

export const limitSubmit = ({ windowSec = 24*3600 } = {}) => {
    return async (req, res, next) => {
        try {
        const cliente = req.cliente;
        if (!cliente) return res.status(400).json({ error: "Cliente no encontrado" });

        if (process.env.NODE_ENV === "production" && !redis) {
            console.error("[limitSubmit] REDIS no configurado");
            return res.status(500).json({ error: "Server misconfiguration: Limite de tarifa" });
        }

        // load subscription if needed
        let sus = req.suscripcion;
        if (!sus) {
            const { data: susData, error: susErr } = await supabase
            .from("suscripcion")
            .select("id_suscripcion, estado, periodo_fin")
            .eq("id_cliente", cliente.id_cliente)
            .order("creado_en", { ascending: false })
            .limit(1)
            .maybeSingle();
            if (susErr) console.warn("[limitSubmit] error leyendo suscripcion:", susErr);
            sus = susData || null;
            req.suscripcion = sus;
        }

        const isPremium = !!(sus && sus.estado === "activo" && sus.periodo_fin && new Date(sus.periodo_fin) > new Date());
        req.isPremiumSubmit = isPremium;

        const key = getTodayKey(cliente.id_cliente);
        const limit = isPremium ? LIMITS.premium : LIMITS.free;

        let current = 0;
        if (isPremium) {
            current = 0;
        } else if (redis) {
            // use redis 
            try {
            current = await incrRedis(key, windowSec);
            } catch (e) {
            console.error("[limitSubmit] redis op error:", e);
            // if redis fails and we're in production, block 
            if (process.env.NODE_ENV === "production") {
                return res.status(500).json({ error: "Rate limiter error" });
            }
            // fallback to in-memory 
            redis = null;
            }
        }

        if (!isPremium && !redis) {
            // fallback in-memory (only non-prod)
            const now = Date.now();
            const rec = INMEM.store.get(key);
            if (!rec || rec.expiresAt <= now) {
            INMEM.store.set(key, { count: 1, expiresAt: now + windowSec * 1000 });
            current = 1;
            } else {
            rec.count += 1;
            current = rec.count;
            INMEM.store.set(key, rec);
            }
        }

        const remaining = isPremium ? Number.POSITIVE_INFINITY : Math.max(limit - current, 0);

        res.setHeader("X-RateLimit-Limit", isFinite(limit) ? limit : "unlimited");
        res.setHeader("X-RateLimit-Remaining", isFinite(remaining) ? remaining : "unlimited");

        console.debug(`[limit] cliente=${cliente.id_cliente} premium=${isPremium} current=${current} remaining=${remaining}`);

        if (!isPremium && current > limit) {
            return res.status(429).json({ error: "Limite diario de envios alcanzado", limit, remaining: 0 });
        }

        req.enviosRestantes = remaining;
        next();
        } catch (err) {
        console.error("limitSubmit unexpected error:", err);
        if (process.env.NODE_ENV === "production") {
            return res.status(500).json({ error: "Rate limiter failure" });
        }
        req.enviosRestantes = 9999;
        req.isPremiumSubmit = false;
        next();
        }
    };
};
