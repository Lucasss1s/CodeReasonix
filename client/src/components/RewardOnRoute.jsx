import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FloatReward from "./FloatReward";

export default function RewardOnRoute({
    position = "top-center",
    offset = { x: 0, y: 18 },
    duration = 2200,
    size = "lg",
    }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [reward, setReward] = useState(null);

    useEffect(() => {
        //via navigate state
        const r = location.state?.reward;

        //via querystring (debug)
        const sp = new URLSearchParams(location.search);
        const qReward = sp.get("reward");
        const qIcon = sp.get("icon");
        const qStreak = sp.get("streak");
        const qStreakXp = sp.get("streakXp");
        let viaQS = null;
        if (qReward) {
        const amount = Number(qReward) || 5;
        const icon = qIcon || "💎";
        const streak = qStreak ? Number(qStreak) : 0;
        const streakXp = qStreakXp ? Number(qStreakXp) : 0;
        const note =
            streak >= 2 && streakXp > 0 ? `🔥 Racha x${streak} (+${streakXp})` : undefined;
        viaQS = { amount, icon, note };
        }

        if (r || viaQS) {
        setReward(r || viaQS);
        // limpiamos state/query para que no se repita en refresh
        navigate(location.pathname, { replace: true, state: {} });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.key]);

    //disparo manual
    useEffect(() => {
        const handler = (e) => {
        const { amount = 5, icon = "💎", note } = e.detail || {};
        setReward({ amount, icon, note });
        };
        window.addEventListener("reward", handler);
        return () => window.removeEventListener("reward", handler);
    }, []);

    if (!reward) return null;

    return (
        <FloatReward
        show={true}
        amount={reward.amount ?? 5}
        icon={reward.icon ?? "💎"}
        position={position}
        offset={offset}
        duration={duration}
        size={size}
        note={reward.note}           
        onDone={() => setReward(null)}
        />
    );
}
