import { useState } from "react";
import axios from "axios";

export default function Comentarios({ idPublicacion, comentarios = [], onUpdate }) {
  const [nuevoComentario, setNuevoComentario] = useState("");

  const handleComentario = async (e) => {
    e.preventDefault();
    const id_cliente = localStorage.getItem("cliente");
    if (!id_cliente) {
      alert("Debes iniciar sesión para comentar.");
      return;
    }

    try {
      await axios.post("http://localhost:5000/comentarios", {
        id_publicacion: idPublicacion,
        id_cliente,
        contenido: nuevoComentario,
      });
      setNuevoComentario("");
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Error creando comentario:", err);
    }
  };

  return (
    <div className="comentarios">
      <h4>Comentarios</h4>

      {comentarios.length > 0 && (
        <div className="comentarios-lista">
          {comentarios.map(com => (
            <div key={com.id_comentario} className="comentario-item">
              <div className="comentario-avatar">
                <div className="comentario-avatar__ph">
                  {(com.cliente?.usuario?.nombre || "U").charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="comentario-body">
                <div className="comentario-header">
                  <span className="comentario-name">
                    {com.cliente.usuario?.nombre || "Usuario"}
                  </span>
                </div>
                <div className="comentario-text">
                  {com.contenido}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleComentario}>
        <input
          type="text"
          value={nuevoComentario}
          onChange={e => setNuevoComentario(e.target.value)}
          placeholder="Escribe un comentario..."
          required
        />
        <button type="submit">Comentar</button>
      </form>
    </div>
  );
}
