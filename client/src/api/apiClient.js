export async function parseResponse(res) {
    let data = null;

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        try {
            data = await res.json();
        } catch {
            data = null;
        }
    }

    if (!res.ok) {
        throw {
            status: res.status,
            data,
            headers: res.headers,
        };
    }

    return {
        ok: res.ok,
        status: res.status,
        data,
        headers: res.headers,
    };
}
