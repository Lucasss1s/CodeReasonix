import { useState } from "react";
import { createPublicacion } from "../../api/publicaciones";
import { feed } from "../../api/feed";

export default function PublicacionForm({ setPublicaciones }) {
  const [contenido, setContenido] = useState("");
  const [imagen, setImagen] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setImagen(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleClearImagen = () => {
    setImagen(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("contenido", contenido);
      if (imagen) formData.append("imagen", imagen);

      await createPublicacion(formData);
      setContenido("");
      handleClearImagen();

      const data = await feed();
      setPublicaciones(data);
    } catch (err) {
      console.error("Error creando publicación:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-publicacion">
      <textarea
        value={contenido}
        onChange={e => setContenido(e.target.value)}
        placeholder="Realiza una publicación"
        required
      />

      <div className="form-publicacion__footer">
        <label className="form-publicacion__filebtn">
          <span>📎 Imagen</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </label>

        {preview && (
          <div className="form-publicacion__preview">
            <img src={preview} alt="Previsualización" />
            <button type="button" onClick={handleClearImagen}>
              ✕
            </button>
          </div>
        )}

        <button type="submit">Publicar</button>
      </div>
    </form>
  );
}
