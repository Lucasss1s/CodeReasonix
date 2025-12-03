export const requirePremium = async (req, res, next) => {
  try {
    const cliente = req.cliente;
    if (!cliente) return res.status(403).json({ error: "No cliente asociado" });

    const { data: sus, error } = await supabase
      .from("suscripcion")
      .select("id_suscripcion, estado, periodo_fin")
      .eq("id_cliente", cliente.id_cliente)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!sus || sus.estado !== "activo" || !sus.periodo_fin || new Date(sus.periodo_fin) <= new Date()) {
      return res.status(403).json({ error: "Requiere suscripción activa" });
    }

    req.suscripcion = sus;
    next();
  } catch (err) {
    console.error("requirePremium error:", err);
    res.status(500).json({ error: "Error comprobando suscripción" });
  }
};
