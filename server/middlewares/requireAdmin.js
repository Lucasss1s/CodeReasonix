import { supabase } from "../config/db.js";

export const requireAdmin = async (req, res, next) => {
    try {
        // requireSesion debe ejecutarse antes
        if (!req.userLocal?.id_usuario) {
        return res.status(401).json({ error: "Sesion requerida" });
        }

        const { data: admin, error } = await supabase
        .from("administrador")
        .select("id_admin, rol")
        .eq("id_usuario", req.userLocal.id_usuario)
        .maybeSingle();

        if (error) {
        console.error("Error validando admin:", error);
        return res.status(500).json({ error: "Error validando permisos" });
        }

        if (!admin) {
        return res.status(403).json({ error: "No tienes permisos para acceder a este recurso" });
        }

        req.admin = admin;
        next();
    } catch (err) {
        console.error("requireAdmin error:", err);
        res.status(500).json({ error: "Error en autorizacion" });
    }
};
