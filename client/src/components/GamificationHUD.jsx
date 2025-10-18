import React, { useMemo } from "react";
import useGamificacion from "../hooks/useGamificacion";
import "./gamification.css";

function ProgressBar({ current, total, label }) {
    const pct = Math.max(0, Math.min(100, total > 0 ? (current / total) * 100 : 0));
    return (
        <div className="ghud-progress">
        <div
            className="ghud-progress__track"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            role="progressbar"
        >
            <div className="ghud-progress__fill" style={{ width: `${pct}%` }} />
        </div>
        {label && <div className="ghud-progress__label">{label}</div>}
        </div>
    );
    }

    function Skeleton() {
    return (
        <div className="ghud-grid">
        {Array.from({ length: 3 }).map((_, i) => (
            <div className="ghud-card ghud-skeleton" key={i}>
            <div className="ghud-skel-line w-60" />
            <div className="ghud-skel-line w-90" />
            <div className="ghud-skel-line w-70" />
            </div>
        ))}
        </div>
    );
    }

    export default function GamificationHUD({ id_cliente }) {
    const { data, loading, error, refetch } = useGamificacion(id_cliente);

    const today = useMemo(() => data?.hoy ?? {}, [data]);
    const progreso =
        data?.progreso ?? { xpEnNivel: 0, xpParaSubir: 100, nextLevelRemaining: 100 };

    if (!id_cliente) return null;
    if (loading) return <Skeleton />;
    if (error) return <div className="ghud-error">Error cargando HUD</div>;

    return (
        <div className="ghud">
        <div className="ghud-header">
            <div className="ghud-header__title">
            <span className="ghud-chip">Gamificación</span>
            <h3>Tu progreso</h3>
            </div>
            <button className="ghud-btn" onClick={refetch} aria-label="Actualizar HUD">
            Actualizar
            </button>
        </div>

        <div className="ghud-grid">
            {/* Nivel / xp */}
            <section className="ghud-card">
            <div className="ghud-card__head">
                <div className="ghud-kpi">
                <div className="ghud-kpi__label">Nivel</div>
                <div className="ghud-kpi__value">{data?.nivel ?? 1}</div>
                </div>
                <div className="ghud-kpi">
                <div className="ghud-kpi__label">XP total</div>
                <div className="ghud-kpi__value">{data?.xp_total ?? 0}</div>
                </div>
            </div>

            <ProgressBar
                current={progreso.xpEnNivel}
                total={progreso.xpParaSubir}
                label={
                <div className="ghud-progress__meta">
                    <span>
                    <strong>{progreso.xpEnNivel}</strong> / {progreso.xpParaSubir} XP
                    </span>
                    <span>
                    Subís en <strong>{progreso.nextLevelRemaining}</strong> XP
                    </span>
                </div>
                }
            />

            <div className="ghud-hint">
                💡 Consejo: resolver un desafío por día mantiene tu racha y acelera el nivel.
            </div>
            </section>

            {/* Act d hoy */}
            <section className="ghud-card">
            <div className="ghud-card__title">Actividad de hoy</div>
            <ul className="ghud-list">
                {[
                { key: "login", label: "Login diario", icon: "🔑" },
                { key: "resolver_ejercicio", label: "Resolver ejercicio", icon: "⚙️" },
                { key: "primer_resuelto_dia", label: "Primer resuelto del día (bonus)", icon: "✨" },
                ].map(({ key, label, icon }) => {
                const t = today[key] || { done: false, xp: 0, contador: 0 };
                return (
                    <li
                    key={key}
                    className={`ghud-list__item ${t.done ? "is-done" : ""}`}
                    >
                    <div className="ghud-list__left">
                        <div className="ghud-list__icon" aria-hidden="true">
                        {icon}
                        </div>
                        <div>
                        <div className="ghud-list__label">{label}</div>
                        <div className="ghud-list__sublabel">
                            {t.done ? `Conseguido · +${t.xp ?? 0} XP` : "Pendiente"}
                        </div>
                        </div>
                    </div>
                    <div
                        className={`ghud-status ${t.done ? "ok" : ""}`}
                        aria-label={t.done ? "Completado" : "Pendiente"}
                    />
                    </li>
                );
                })}
            </ul>
            </section>

            {/* Racha */}
            <section className="ghud-card">
            <div className="ghud-card__title">Racha</div>
            <div className="ghud-streak">
                <div className="ghud-streak__value">{data?.streak ?? 0}</div>
                <div className="ghud-streak__label">días consecutivos</div>
                <div className="ghud-streak__flame" aria-hidden="true">
                🔥
                </div>
            </div>
            <div className="ghud-hint">Mantené la racha para multiplicadores de XP.</div>
            </section>

            {/* Feed */}
            <section className="ghud-card ghud-feed">
            <div className="ghud-card__title">Actividad reciente</div>
            {(data?.feed ?? []).length === 0 ? (
                <div className="ghud-empty">Sin movimientos de XP todavía.</div>
            ) : (
                <ul className="ghud-feed__list">
                {data.feed.map((f, i) => (
                    <li key={i} className="ghud-feed__item">
                    <div className="ghud-feed__left">
                        <div className="ghud-feed__xp">+{f.puntos} XP</div>
                        <div className="ghud-feed__meta">
                        {f.motivo?.tipo || "otro"}
                        {f.motivo?.detalle ? ` · ${JSON.stringify(f.motivo.detalle)}` : ""}
                        </div>
                    </div>
                    <div className="ghud-feed__time">
                        {new Date(f.fecha).toLocaleString()}
                    </div>
                    </li>
                ))}
                </ul>
            )}
            </section>
        </div>
        </div>
    );
}
