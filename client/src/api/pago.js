import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function createPago(price, moneda) {
    const res =  await authFetch(`${API_BASE}/pagos/create`, {
        method: "POST",
        body: JSON.stringify({ 
            monto: Number(price), 
            moneda: moneda,
        }),
    });
    const { data } = await parseResponse(res);
    return data;
}

export async function confirmPago(id_pago, card) {
    const res =  await authFetch(`${API_BASE}/pagos/${id_pago}/confirm`, {
        method: "POST",
        body: JSON.stringify({
            card_number: card.number,
            exp: card.exp,
            cvv: card.cvv,
        }),
    });
    
    const { data } = await parseResponse(res);
    return data;
}