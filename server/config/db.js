import dotenv from 'dotenv'; //Variables de entorno .env
dotenv.config();

import { createClient } from '@supabase/supabase-js'; //Cliente de Supabase

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey); //Instancia de Supabase 
