import { supabase } from "../config/db.js";

/**
 * - Buscar Bearer <token>
 * - Validar token (supabase.auth.getUser)
 * - Adjuntar req.authUser y req.userLocal
 */
export const requireSesion = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ error: "Token requerido (Authorization)" });
    }

    //Validar token with Supabase
    const { data: supaData, error: supaErr } = await supabase.auth.getUser(token);
    if (supaErr || !supaData?.user) {
      console.error("Supabase token error:", supaErr);
      return res.status(401).json({ error: "Token invalido" });
    }

    const authUser = supaData.user; 
    req.authUser = authUser;

    //Buscar id_usuario in tabla 'usuario' por email 
    const { data: userLocal, error: userLocalErr } = await supabase
      .from("usuario")
      .select("id_usuario, nombre, email, estado")
      .eq("email", authUser.email)
      .maybeSingle();

    if (userLocalErr) {
      console.error("Error buscando usuario local:", userLocalErr);
      return res.status(500).json({ error: "Error resolviendo usuario local" });
    }

    if (!userLocal) {
      return res.status(401).json({ error: "No se encontró usuario local asociado al token" });
    }

    req.userLocal = userLocal;

    //traer cliente
    const { data: cliente, error: clienteErr } = await supabase
      .from("cliente")
      .select("id_cliente, id_usuario, tarjeta, subscripcion")
      .eq("id_usuario", userLocal.id_usuario)
      .maybeSingle();

    if (clienteErr) {
      console.error("Error buscando cliente:", clienteErr);
      return res.status(500).json({ error: "Error resolviendo cliente" });
    }

    req.cliente = cliente || null;

    next();
  } catch (err) {
    console.error("requireSesion error:", err);
    res.status(500).json({ error: "Error en autenticación" });
  }
};
