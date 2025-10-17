import axios from 'axios';

const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = '8668480b47msh8121b1a2d90e0d8p1e90cfjsn899afe11cddc'; // key
const RAPIDAPI_HOST = 'judge0-ce.p.rapidapi.com';

const lenguajeMap = {
    python: 71,
    javascript: 63,
    c: 50,
    cpp: 54,
    java: 62
};

export async function enviarCodigo(codigo, lenguaje) {
    try {
        const response = await axios.post(
            `${JUDGE0_URL}/submissions`,
            {
                source_code: codigo,
                language_id: lenguajeMap[lenguaje], 
                stdin: '',
                expected_output: null
            },
            {
                headers: {
                    'X-RapidAPI-Key': RAPIDAPI_KEY,
                    'X-RapidAPI-Host': RAPIDAPI_HOST,
                    'Content-Type': 'application/json'
                },
                params: { base64_encoded: false, wait: true } 
            }
        );

        return response.data;
    } catch (err) {
        console.error('Error Judge0:', err.response?.data || err.message);
        throw err;
    }
}
