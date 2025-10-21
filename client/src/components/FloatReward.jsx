import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./float-reward.css";

export default function FloatReward({
    show,
    amount = 5,
    icon = "💎",
    duration = 2000,
    position = "top-center",
    offset = { x: 0, y: 18 },
    size = "lg",
    note,               
    onDone,
    }) {
    const [visible, setVisible] = useState(show);

    useEffect(() => {
        if (!show) return;
        setVisible(true);
        const t = setTimeout(() => {
        setVisible(false);
        onDone?.();
        }, duration);
        return () => clearTimeout(t);
    }, [show, duration, onDone]);

    if (!visible) return null;

    const posStyle = (() => {
        const base = { position: "fixed", zIndex: 9999 };
        if (position === "top-right") return { ...base, top: offset.y, right: offset.x || 20 };
        if (position === "top-left")  return { ...base, top: offset.y, left:  offset.x || 20 };
        return { ...base, top: offset.y, left: "50%", transform: "translateX(-50%)" };
    })();

    const node = (
        <div className="fr" style={posStyle} aria-live="polite" aria-atomic="true">
        <div className={`fr-item fr-${size}`}>
            <span className="fr-icon">{icon}</span>
            <span className="fr-text">+{amount} XP</span>
        </div>
        {note ? <div className="fr-note">{note}</div> : null}
        </div>
    );

    return createPortal(node, document.body);
}
