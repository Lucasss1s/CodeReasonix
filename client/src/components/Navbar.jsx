import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../config/supabase.js";
import { toast } from "sonner";
import "./navbar.css";
import RewardOnRoute from "./RewardOnRoute";
import logoCodeReasonix from "../assets/logo-codereasonix.svg";
import { getPerfil } from "../api/perfil.js";
import { postLoginXP } from "../api/gamificacion.js";

export default function Navbar() {
  const [usuario, setUsuario] = useState(null);
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);
  const menuRef = useRef(null);

  const id_cliente = localStorage.getItem("cliente");
  const location = useLocation();

  const isActive = (prefix) => {
    if (prefix === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(prefix);
  };

  const syncAdminFromStorage = () => {
    const raw = localStorage.getItem("es_admin");
    const flag = raw === "true" || raw === "1";
    setEsAdmin(flag);
  };

  useEffect(() => {
    const fetchUsuario = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (user) {
        const { data, error } = await supabase
          .from("usuario")
          .select("nombre")
          .eq("email", user.email)
          .single();

        if (error) {
          console.error("Error al obtener el nombre:", error);
          setUsuario({ nombre: user.email });
        } else {
          setUsuario(data);
        }

        if (id_cliente) {
          try {
            const data = await getPerfil();
            setFotoPerfil(data?.foto_perfil || "/default-avatar.png");
          } catch {
            setFotoPerfil("/default-avatar.png");
          }
        }

        syncAdminFromStorage();
      } else {
        setUsuario(null);
        setFotoPerfil(null);
        setEsAdmin(false);
      }
    };

    fetchUsuario();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          setUsuario(null);
          setFotoPerfil(null);
          setEsAdmin(false);
        } else {
          syncAdminFromStorage();
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [id_cliente]);

  useEffect(() => {
    const handleClickFuera = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  useEffect(() => {
    const id = localStorage.getItem("cliente");
    if (!id) return;

    const today = new Date().toISOString().slice(0, 10);
    const key = `login_xp_last:${id}`;
    const last = localStorage.getItem(key);

    if (last === today) return;

    (async () => {
      try {
        const data = await postLoginXP();
        localStorage.setItem(key, today);

        if (data.otorgado) {
          const a = data?.reward_login?.amount || 0;
          const b = data?.reward_streak?.amount || 0;
          const total = a + b;

          if (total > 0) {
            const icon = b > 0 ? "🔥" : "💎";
            const note =
              b > 0 && (data?.streak ?? 0) >= 2
                ? `🔥 Racha x${data.streak} (+${b})`
                : undefined;
            window.dispatchEvent(
              new CustomEvent("reward", {
                detail: { amount: total, icon, note },
              })
            );
          }
          if (Array.isArray(data?.nuevosLogros) && data.nuevosLogros.length) {
            data.nuevosLogros.forEach((l) => {
              toast.success(
                `¡Logro desbloqueado! ${l.icono} ${l.titulo} ${
                  l.xp_otorgado ? `(+${l.xp_otorgado} XP)` : ""
                }`
              );
            });
          }
        }
      } catch (e) {
        console.warn("Error llamando login-xp desde Navbar:", e);
      }
    })();
  }, []);

  return (
    <>
      <nav className="navbar">
        <div className="nav-left">
          <Link to="/" className="logo-link">
            <img
              src={logoCodeReasonix}
              alt="CodeReasonix"
              className="logo-icon"
            />
          </Link>
        </div>

        <div className="nav-center">
          <Link
            className={`btn-nav ${isActive("/comunidad") ? "active" : ""}`}
            to="/comunidad"
          >
            Comunidad
          </Link>
          <Link
            className={`btn-nav ${isActive("/entrevistas") ? "active" : ""}`}
            to="/entrevistas"
          >
            Entrevistas
          </Link>
          <Link
            className={`btn-nav ${isActive("/desafios") ? "active" : ""}`}
            to="/desafios"
          >
            Desafíos
          </Link>
          <Link
            className={`btn-nav ${isActive("/ranking") ? "active" : ""}`}
            to="/ranking"
          >
            Ranking
          </Link>
        </div>

        <div className="nav-right">
          {usuario ? (
            <div className="menu-container" ref={menuRef}>
              <img
                src={fotoPerfil || "/default-avatar.png"}
                alt="Perfil"
                className="avatar"
                onClick={() => setMenuAbierto(!menuAbierto)}
              />
              {menuAbierto && (
                <div className="menu-dropdown">
                  <Link to="/perfil" className="dropdown-item">
                    Ver Perfil
                  </Link>
                  <Link
                    to="/entrevistas/mis-postulaciones"
                    className="dropdown-item"
                  >
                    Postulaciones
                  </Link>
                  <Link to="/mis-desafios" className="dropdown-item">
                    Mis Desafíos
                  </Link>

                  {esAdmin && (
                    <Link to="/admin" className="dropdown-item">
                      Panel ABM
                    </Link>
                  )}

                  <Link to="/logout" className="dropdown-item">
                    Cerrar Sesión
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-nav auth">
                Iniciar Sesión
              </Link>
            </>
          )}
        </div>
      </nav>

      <RewardOnRoute position="top-center" duration={2400} size="lg" />
    </>
  );
}
