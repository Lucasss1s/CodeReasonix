import express from 'express';
import { supabase } from '../config/db.js'; 

const router = express.Router(); //Manejador de rutas independientes

router.get('/', async (req, res) => {
    try {
        const { data: usuarios, error } = await supabase
            .from('usuario')
            .select('id_usuario, nombre, email, estado, cliente(id_cliente, tarjeta, subscripcion), administrador(id_admin, rol)');

        if (error) throw error;

        res.json(usuarios);
    } catch (err) {
    console.error('Error obteniendo usuarios:', err);
    res.status(500).json({ error: 'Error obteniendo usuarios'});
    }
});

export default router;
