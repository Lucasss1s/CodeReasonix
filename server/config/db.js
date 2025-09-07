// Carga variables de entorno desde .env
import dotenv from 'dotenv';
dotenv.config();

// Importa el cliente de Supabase
import { createClient } from '@supabase/supabase-js';

/*
  Supabase URL y KEY:
  - Supabase URL: dirección de tu proyecto en la nube
  - Supabase KEY: Service Role Key (para backend)
*/
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Crear instancia de Supabase que usamos en todo el backend
export const supabase = createClient(supabaseUrl, supabaseKey);
