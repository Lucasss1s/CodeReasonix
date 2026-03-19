import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { 
    getPistasEjercicio,
    unlockPistasEjercicio,
} from "../../api/ejercicioPistas";
import "./ejercicio-pistas.css";

export default function EjercicioPistas({ idEjercicio, idCliente, onProgress }) {
    const [pistas, setPistas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unlocking, setUnlocking] = useState(false);

    const unlockedCount = useMemo(
        () => pistas.filter(p => p.unlocked).length,
        [pistas]
    );
    const total = pistas.length;

    const nextLocked = useMemo(
        () => pistas.find(p => !p.unlocked) || null,
        [pistas]
    );

    const fetchPistas = async () => {
        if (!idEjercicio) {
            setLoading(false);
            return;
        }
        setLoading(true);

        try { 
            const data = await getPistasEjercicio(idEjercicio);
            const list = data?.pistas || [];
            setPistas(list);
            
            const u = list.filter(p => p.unlocked).length;
            onProgress?.({ unlocked: u, total: list.length });
        } catch (err) {
            console.error("[PISTAS] fetch fail", err);
            toast.error("No se pudieron cargar las pistas");
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        fetchPistas();
        //eslint-disable-next-line
    }, [idEjercicio, idCliente]);

    const unlockNext = async () => {
        if (!idCliente) return toast.info("Inicia sesión para ver pistas");
        if (!nextLocked) return;

        setUnlocking(true);

        try {
            const data = await unlockPistasEjercicio(idEjercicio);

            const pid = data?.pista?.id_pista;
            if (!pid) {
                await fetchPistas();
                return;
            }

            setPistas(prev =>
                prev.map(p =>
                    p.id_pista === pid
                        ? { ...p, unlocked: true }
                        : p
                )
            );
            if (data?.progreso) {
                onProgress?.(data.progreso);
            }

            toast.success(`Pista #${data?.pista?.orden} desbloqueada`);
        } catch (err) {
            console.error("[PISTAS] unlock fail", err);
            toast.error(err.message || "No se pudo desbloquear la pista");
        } finally {
            setUnlocking(false);
        }
    };

    return (
        <div className="pistas-box" id="exercise-hints">
        <div className="pistas-header">
            <h3 className="pistas-title">
            <i className="fa-regular fa-lightbulb" /> Pistas
            </h3>
            <div className="pistas-actions">
            <span className="pistas-progress">
                {unlockedCount}/{total}
            </span>
            <button
                className="ex-btn"
                onClick={unlockNext}
                disabled={!nextLocked || unlocking}
                title={nextLocked ? "Mostrar siguiente pista" : "No hay más pistas"}
            >
                {unlocking ? "Desbloqueando…" : "Ver siguiente pista"}
            </button>
            </div>
        </div>

        {loading ? (
            <div className="pistas-empty">Cargando pistas…</div>
        ) : total === 0 ? (
            <div className="pistas-empty">Este ejercicio no tiene pistas.</div>
        ) : (
            <div className="pistas-list">
            {pistas.map((p) => (
                <div key={p.id_pista} className={`pista-card ${p.unlocked ? "" : "is-locked"}`}>
                <div className="pista-card__head">
                    <span className="pista-order">#{p.orden}</span>
                    <span className="pista-title">{p.titulo}</span>
                    {!p.unlocked && <span className="pista-lock"><i className="fa-solid fa-lock" /></span>}
                </div>

                <div className="pista-content">
                    {p.unlocked ? (
                    <>
                        <p>{p.contenido}</p>
                    </>
                    ) : (
                    <p className="pista-blur">Pista bloqueada</p>
                    )}
                </div>
                </div>
            ))}
            </div>
        )}
        </div>
    );
}
