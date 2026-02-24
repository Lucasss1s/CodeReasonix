import { toggleReaccion } from "../../api/reacciones";

export default function Reacciones({ idPublicacion, reacciones = [], onUpdate }) {
  const id_cliente = localStorage.getItem("cliente");

  const handleReaccion = async (tipo) => {
    if (!id_cliente) {
      alert("Debes iniciar sesión para reaccionar.");
      return;
    }

    try {
      await toggleReaccion(idPublicacion, tipo);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Error creando reacción:", err);
    }
  };

  const likes = reacciones.filter(r => r.tipo === "like").length;
  const dislikes = reacciones.filter(r => r.tipo === "dislike").length;
  const miReaccion = reacciones.find(r => String(r.cliente?.id_cliente) === String(id_cliente));

  return (
    <div className="reacciones">
      <button
        className={`reaccion-btn ${miReaccion?.tipo === "like" ? "is-active-like" : ""}`}
        onClick={() => handleReaccion("like")}
      >
        👍 <span>{likes}</span>
      </button>
      <button
        className={`reaccion-btn ${miReaccion?.tipo === "dislike" ? "is-active-dislike" : ""}`}
        onClick={() => handleReaccion("dislike")}
      >
        👎 <span>{dislikes}</span>
      </button>
    </div>
  );
}
