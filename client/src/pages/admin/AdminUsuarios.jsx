import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar.jsx";
import API_BASE from "../../config/api";
import { toast } from "sonner";
import "./admin.css";

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const rawFlag = localStorage.getItem("es_admin");
    const esAdmin = rawFlag === "true" || rawFlag === "1";

    if (!esAdmin) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      setError("");
      const res = await axios.get(`${API_BASE}/usuarios`);
      setUsuarios(res.data || []);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      setError("No se pudieron cargar los usuarios.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleToggleEstado = async (user) => {
    const nuevoEstado = !user.estado;

    try {
      setGuardandoId(user.id_usuario);

      const res = await axios.put(`${API_BASE}/usuarios/${user.id_usuario}`, {
        estado: nuevoEstado,
      });

      const actualizado = res.data;

      setUsuarios((prev) =>
        prev.map((u) =>
          u.id_usuario === actualizado.id_usuario ? actualizado : u
        )
      );

      toast.success(
        `Usuario ${actualizado.nombre} ${
          actualizado.estado ? "reactivado ✅" : "baneado 🚫"
        }`
      );
    } catch (err) {
      console.error("Error actualizando estado:", err);
      toast.error("No se pudo actualizar el estado del usuario.");
    } finally {
      setGuardandoId(null);
    }
  };

  return (
    <>
      <Navbar />
      <div className="admin-page">
        <header className="admin-header">
          <div>
            <h2 className="admin-title">Panel ABM — Usuarios</h2>
            <p className="admin-subtitle">
              Gestión de usuarios registrados y estado de la cuenta (activa / baneada).
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admindesafios")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: "0.9rem",
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Panel ABM — Desafíos
          </button>
        </header>

        {error && <div className="admin-error">{error}</div>}

        {cargando ? (
          <div className="admin-loading">Cargando usuarios...</div>
        ) : (
          <section className="admin-card">
            {usuarios.length === 0 ? (
              <div className="admin-empty">No hay usuarios registrados.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => {
                    const estaActiva = !!u.estado;

                    return (
                      <tr
                        key={u.id_usuario}
                        className={estaActiva ? "" : "user-row-banned"}
                      >
                        <td>{u.id_usuario}</td>
                        <td>{u.nombre}</td>
                        <td>{u.email}</td>

                        <td>
                          <span
                            className={`estado-pill ${
                              estaActiva ? "estado-activo" : "estado-baneado"
                            }`}
                          >
                            {estaActiva ? "Activa" : "Baneada"}
                          </span>
                        </td>

                        <td>
                          <div className="admin-actions">
                            <button
                              type="button"
                              className={`btn-estado ${
                                estaActiva ? "btn-bloquear" : "btn-desbloquear"
                              }`}
                              onClick={() => handleToggleEstado(u)}
                              disabled={guardandoId === u.id_usuario}
                            >
                              {guardandoId === u.id_usuario
                                ? "Guardando..."
                                : estaActiva
                                ? "Banear"
                                : "Desbanear"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        )}
      </div>
    </>
  );
}
