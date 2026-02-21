import { authFetch } from "../utils/authToken";
import API_BASE from "../config/api";
import { parseResponse } from "./apiClient";

export async function submit(payload) {
    const res = await authFetch(`${API_BASE}/submit`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    
    return parseResponse(res);
}