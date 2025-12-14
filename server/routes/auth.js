import express from "express";
import { supabase } from "../config/db.js";

const router = express.Router();

router.post("/oauth", async (req, res) => {

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token" });
        }

        const token = authHeader.replace("Bearer ", "");

        //Validar token con Supabase
        const { data: authData, error: authError } =
        await supabase.auth.getUser(token);

        if (authError || !authData?.user) {
        return res.status(401).json({ error: "Token invalido" });
        }

        const { id: sesion_id, email, user_metadata } = authData.user;
        const nombre = user_metadata?.full_name || user_metadata?.name || email;

        //Buscar usuario 
        let { data: users, error: userErr } = await supabase
        .from("usuario")
        .select("id_usuario, nombre, email, estado")
        .eq("sesion_id", sesion_id);

        if (userErr) throw userErr;

        let user = users?.[0];

        if (!user) {
            const { data: byEmail, error: emailErr } = await supabase
                .from("usuario")
                .select("id_usuario, nombre, email, estado")
                .eq("email", email)
                .single();

            if (emailErr && emailErr.code !== "PGRST116") {
                throw emailErr;
            }

            if (byEmail) {
                // Vincular cuenta OAuth
                const { error: updateErr } = await supabase
                .from("usuario")
                .update({ sesion_id })
                .eq("id_usuario", byEmail.id_usuario);

                if (updateErr) throw updateErr;

                user = byEmail;
            }
        }



        //Crear usuario si no existe
        if (!user) {
        const { data: newUser, error: createErr } = await supabase
            .from("usuario")
            .insert([{
            nombre,
            email,
            contraseña: "",
            estado: true,
            fecha_registro: new Date(),
            sesion_id
            }])
            .select()
            .single();

        if (createErr) throw createErr;

        user = newUser;

        //cliente
        const { data: clientData, error: clientErr } = await supabase
            .from("cliente")
            .insert([{ id_usuario: user.id_usuario }])
            .select()
            .single();

        if (clientErr) throw clientErr;

        //perfil
        await supabase.from("perfil").insert([{
            id_cliente: clientData.id_cliente,
            biografia: "",
            skills: "",
            reputacion: 0
        }]);
        }

        //Validar
        if (user.estado === false) {
        return res.status(403).json({ error: "Esta cuenta esta suspendida" });
        }

        const { data: clienteRows } = await supabase
        .from("cliente")
        .select("id_cliente")
        .eq("id_usuario", user.id_usuario);

        const id_cliente = clienteRows?.[0]?.id_cliente ?? null;

        const { data: adminRows } = await supabase
        .from("administrador")
        .select("id_admin, rol")
        .eq("id_usuario", user.id_usuario);

        const admin = adminRows?.[0] ?? null;

        res.json({
        usuario: {
            id_usuario: user.id_usuario,
            nombre: user.nombre,
            email: user.email,
        },
        id_cliente,
        es_admin: !!admin,
        admin
        });

    } catch (err) {
        console.error("Error OAuth:", err);
        res.status(500).json({ error: "Error procesando OAuth" });
    }
});

export default router;
