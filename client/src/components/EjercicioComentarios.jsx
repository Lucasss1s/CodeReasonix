import { useEffect, useState } from "react";
import { toast } from "sonner";
import "./ejercicio-comentarios.css";
import API_BASE from "../config/api";

function CommentItem({ comment, currentClientId, onReply, onToggleReact, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  const mine = Number(comment.id_cliente) === Number(currentClientId);
  const userName =
    comment.cliente?.usuario?.nombre ||
    comment.cliente?.usuario?.email?.split("@")[0] ||
    "Usuario";

  const isDeleted = /^\s*🗑️ \[Comentario eliminado por su autor\]/.test(comment.contenido);
  const myReaction = (comment.reacciones || []).find(
    (r) => Number(r.id_cliente) === Number(currentClientId) && r.tipo === "like"
  );
  const likes = (comment.reacciones || []).filter((r) => r.tipo === "like").length;

  return (
    <div className={`ex-comment ${comment.parent_id ? "is-reply" : ""} ${isDeleted ? "is-deleted" : ""}`}>
      <div className="ex-comment__header">
        <div className="ex-comment__avatar"><i className="fa-solid fa-user" /></div>
        <div>
          <div className="ex-comment__author">{userName}</div>
          <div className="ex-comment__date">{new Date(comment.fecha).toLocaleString()}</div>
        </div>
      </div>

      <div className="ex-comment__body">
        {isDeleted ? <em>{comment.contenido}</em> : comment.contenido}
      </div>

      <div className="ex-comment__actions">
        {!isDeleted && (
          <>
            <button
              className="ex-btn ex-btn--ghost"
              onClick={() => onToggleReact(comment.id_comentario, "like")}
            >
              <i className={myReaction ? "fa-solid fa-thumbs-up" : "fa-regular fa-thumbs-up"} />
              {myReaction ? " Te gusta" : " Me gusta"}
            </button>

            <button
              className="ex-btn ex-btn--ghost"
              onClick={() => onReply({ parent_id: comment.id_comentario, to: userName })}
            >
              <i className="fa-regular fa-comment" /> Responder
            </button>
          </>
        )}

        {likes > 0 && <span className="ex-comment__reactions">{likes} 👍</span>}

        {mine && !isDeleted && (
          confirming ? (
            <>
              <button className="ex-btn ex-btn--ghost" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
              <button
                className="ex-btn ex-btn--danger"
                onClick={() => { onDelete(comment.id_comentario); setConfirming(false); }}
                title="Eliminar comentario"
              >
                <i className="fa-solid fa-trash-can" /> Eliminar
              </button>
            </>
          ) : (
            <button
              className="ex-btn ex-btn--ghost ex-btn--danger"
              onClick={() => setConfirming(true)}
              title="Borrar comentario"
            >
              <i className="fa-regular fa-trash-can" /> Borrar
            </button>
          )
        )}

        {mine && <span className="ex-comment__badge">tú</span>}
      </div>
    </div>
  );
}

export default function EjercicioComentarios({
  idEjercicio,
  idCliente,
  order = "recientes",
  onCountChange,
  showTitle = true
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);

  const fetchComments = async () => {
    if (!idEjercicio) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ejercicio-comentarios/${idEjercicio}/comentarios`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setComments(data || []);
      onCountChange?.(data?.length || 0);
    } catch (err) {
      console.error(err);
      toast.error("No se pudieron cargar los comentarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComments(); 
    // eslint-disable-next-line 
  }, [idEjercicio]);

  const handleSend = async () => {
    if (!idCliente) return toast.info("Tenés que iniciar sesión para comentar.");
    const contenido = text.trim();
    if (!contenido) return;

    setSending(true);
    try {
      const payload = { id_cliente: idCliente, contenido };
      if (replyTo?.parent_id) payload.parent_id = replyTo.parent_id;

      const res = await fetch(`${API_BASE}/ejercicio-comentarios/${idEjercicio}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const nuevo = await res.json();

      setComments((prev) => [nuevo, ...prev]);
      onCountChange?.((prevCount) => (typeof prevCount === "number" ? prevCount + 1 : prevCount));
      setText("");
      setReplyTo(null);
      toast.success("Comentario publicado");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo publicar el comentario");
    } finally {
      setSending(false);
    }
  };

  const startReply = ({ parent_id, to }) => {
    setReplyTo({ parent_id, to });
    setText(`@${to} `);
  };

  const toggleReaction = async (idComentario, tipo = "like") => {
    if (!idCliente) return toast.info("Logueate para reaccionar.");

    //Primera (ahorrar recarga)
    setComments(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(c => c.id_comentario === idComentario);
      if (idx === -1) return prev;

      const c = copy[idx];
      const yaLike = (c.reacciones || []).some(r => Number(r.id_cliente) === Number(idCliente) && r.tipo === "like");
      let reacciones;
      if (yaLike) {
        reacciones = (c.reacciones || []).filter(r => !(Number(r.id_cliente) === Number(idCliente) && r.tipo === "like"));
      } else {
        reacciones = [...(c.reacciones || []), { id_cliente: idCliente, tipo: "like", fecha: new Date().toISOString() }];
      }
      copy[idx] = { ...c, reacciones };
      return copy;
    });

    //Llamada real
    try {
      const res = await fetch(`${API_BASE}/ejercicio-comentarios/comentarios/${idComentario}/reaccion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_cliente: idCliente, tipo }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo actualizar la reacción");
      fetchComments();
    }
  };

  //Agrupado y orden
  const likeCount = (c) => (c.reacciones || []).filter((r) => r.tipo === "like").length;
  const roots = comments.filter((c) => !c.parent_id);
  const byParent = comments.reduce((acc, c) => {
    if (c.parent_id) {
      if (!acc[c.parent_id]) acc[c.parent_id] = [];
      acc[c.parent_id].push(c);
    }
    return acc;
  }, {});

  const deleteComment = async (idComentario) => {
    if (!idCliente) return toast.info("Logueate para borrar tu comentario.");
    try {
      const res = await fetch(`${API_BASE}/ejercicio-comentarios/comentarios/${idComentario}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Id": String(idCliente), 
        },
        body: JSON.stringify({ id_cliente: idCliente }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      if (data.deleted) {
        toast.success("Comentario eliminado");
        //refresh 
        await fetchComments();
      } else if (data.softDeleted) {
        toast.success("Comentario marcado como eliminado");
        setComments((prev) =>
          prev.map((c) =>
            c.id_comentario === idComentario
              ? { ...c, contenido: "🗑️ [Comentario eliminado por su autor]" }
              : c
          )
        );
      } else {
        await fetchComments();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "No se pudo borrar el comentario");
    }
  };

  const sortedRoots =
    order === "populares"
      ? [...roots].sort((a, b) => likeCount(b) - likeCount(a) || new Date(b.fecha) - new Date(a.fecha))
      : [...roots].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return (
    <div className="ex-comments-box" id="exercise-comments">
      {showTitle && (
        <h3 className="ex-title">
          Comentarios del ejercicio
          <span className="ex-count">{comments.length ? `(${comments.length})` : ""}</span>
        </h3>
      )}

      {/* Form */}
      <div className="ex-form">
        {replyTo && (
          <div className="ex-replying">
            Respondiendo a <strong>@{replyTo.to}</strong>{" "}
            <button className="ex-btn ex-btn--ghost" onClick={() => setReplyTo(null)}>cancelar</button>
          </div>
        )}
        <textarea
          className="ex-input"
          rows={3}
          placeholder={idCliente ? "Escribí tu duda, comentario o explicación…" : "Iniciá sesión para comentar"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!idCliente}
        />
        <div className="ex-form__actions">
          <button className="ex-btn" onClick={handleSend} disabled={!idCliente || sending}>
            <i className="fa-solid fa-paper-plane" /> {sending ? "Enviando…" : "Comentar"}
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="ex-list">
        {loading ? (
          <div className="ex-empty">Cargando comentarios…</div>
        ) : sortedRoots.length === 0 ? (
          <div className="ex-empty">No hay comentarios aún. Sé el primero 👇</div>
        ) : (
          sortedRoots.map((c) => (
            <div key={c.id_comentario}>
              <CommentItem
                comment={c}
                currentClientId={idCliente}
                onReply={startReply}
                onToggleReact={toggleReaction}
                onDelete={deleteComment}
              />
              {(byParent[c.id_comentario] || []).map((r) => (
                <CommentItem
                  key={r.id_comentario}
                  comment={r}
                  currentClientId={idCliente}
                  onReply={startReply}
                  onToggleReact={toggleReaction}
                  onDelete={deleteComment}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
