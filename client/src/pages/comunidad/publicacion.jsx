import { useState } from "react";
import axios from "axios";

export default function PublicacionForm({ setPublicaciones }) {
  const [contenido, setContenido] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const id_cliente = localStorage.getItem("cliente"); 
    if (!id_cliente) {
      alert("Debes iniciar sesión para publicar.");
      return;
    }

    try {
      await axios.post("http://localhost:5000/publicaciones", {
        id_cliente,
        contenido
      });

      setContenido("");

      const res = await axios.get("http://localhost:5000/feed");
      setPublicaciones(res.data);
    } catch (err) {
      console.error("Error creando publicación:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-publicacion">
      <textarea
        value={contenido}
        onChange={e => setContenido(e.target.value)}
        placeholder="Realiza una publicacion"
        required
      />
      <button type="submit">Publicar</button>
    </form>
  );
}
