import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import { parseResponse } from "./apiClient";

export async function feed() {
    const res =  await authFetch(`${API_BASE}/feed`);
    const { data } = await parseResponse(res);
    return data;
}


