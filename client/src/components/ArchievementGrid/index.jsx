import React from "react";
import "./achievement.css";

function ProgressMini({ current = 0, goal = 1 }) {
    const pct = Math.max(0, Math.min(100, goal ? (current / goal) * 100 : 100));
    return (
        <div className="achv-mini">
        <div className="achv-mini__bar">
            <div className="achv-mini__fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="achv-mini__label">{current}/{goal}</div>
        </div>
    );
    }

    function Item({ item, unlocked }) {
    const progress = item.progress;
    return (
        <div className={`achv-card ${unlocked ? "is-unlocked" : "is-locked"}`}>
        <div className="achv-icon" aria-hidden="true">{item.icono}</div>
        <div className="achv-content">
            <div className="achv-title">{item.titulo}</div>
            <div className="achv-desc">{item.descripcion}</div>

            {!unlocked && progress && (
            <div className="achv-progress">
                <div className="achv-progress__label">{progress.label}</div>
                <ProgressMini current={progress.current} goal={progress.goal} />
            </div>
            )}

            {unlocked && typeof item.xp_otorgado === "number" && item.xp_otorgado > 0 && (
            <div className="achv-xp">+{item.xp_otorgado} XP</div>
            )}
        </div>

        {/*Card hover */}
        <div className="achv-hover">
            <div className="achv-hover__title">{item.icono} {item.titulo}</div>
            <div className="achv-hover__desc">{item.descripcion}</div>
            {progress && !unlocked && (
            <>
                <div className="achv-hover__subtitle">{progress.label}</div>
                <ProgressMini current={progress.current} goal={progress.goal} />
            </>
            )}
        </div>
        </div>
    );
    }

    export default function AchievementGrid({ unlocked = [], locked = [] }) {
    return (
        <div className="achv-grid">
        <section>
            <h3>🏆 Desbloqueados ({unlocked.length})</h3>
            <div className="achv-list">
            {unlocked.map(a => (
                <Item key={a.id_logro} item={a} unlocked />
            ))}
            </div>
        </section>

        <section>
            <h3>🔒 Bloqueados ({locked.length})</h3>
            <div className="achv-list">
            {locked.map(a => (
                <Item key={a.id_logro} item={a} unlocked={false} />
            ))}
            </div>
        </section>
        </div>
    );
}
