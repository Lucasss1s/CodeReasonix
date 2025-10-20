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
        const viaQS = qReward ? { amount: Number(qReward) || 5, icon: qIcon || "💎" } : null;

        if (r || viaQS) {
        setReward(r || viaQS);
        navigate(location.pathname, { replace: true, state: {} });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.key]);

    //disparo manual 
    useEffect(() => {
        const handler = (e) => {
        const { amount = 5, icon = "💎" } = e.detail || {};
        setReward({ amount, icon });
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
        onDone={() => setReward(null)}
        />
    );
}
