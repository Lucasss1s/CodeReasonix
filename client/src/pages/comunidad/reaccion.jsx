import axios from "axios";

export default function Reacciones({ idPublicacion, reacciones = [], onUpdate }) {
  const id_cliente = localStorage.getItem("cliente");

  const handleReaccion = async (tipo) => {
    if (!id_cliente) {
      alert("Debes iniciar sesión para reaccionar.");
      return;
    }

    try {
      await axios.post("http://localhost:5000/reacciones", {
        id_publicacion: idPublicacion,
        id_cliente,
        tipo,
      });

      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Error creando reacción:", err);
    }
  };

  const likes = reacciones.filter(r => r.tipo === "like").length;
  const dislikes = reacciones.filter(r => r.tipo === "dislike").length;

  return (
    <div className="reacciones">
      <button onClick={() => handleReaccion("like")}>👍 {likes}</button>
      <button onClick={() => handleReaccion("dislike")}>👎 {dislikes}</button>
    </div>
  );
}
