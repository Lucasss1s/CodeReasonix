export const isFormData = (body) =>
    typeof FormData !== "undefined" && body instanceof FormData;
