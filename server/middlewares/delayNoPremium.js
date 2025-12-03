export const delayNoPremium = ({ freeDelaySec = 12, premiumDelaySec = 0 } = {}) => {
    return async (req, res, next) => {
        try {
        // set limitSubmit
        const isPremium = !!req.isPremiumSubmit;
        const delay = isPremium ? premiumDelaySec : freeDelaySec;

        // Si hay delay espera
        if (delay > 0) {
            await new Promise(r => setTimeout(r, delay * 1000));
        }
        next();
        } catch (err) {
        console.warn("delayNoPremium error:", err);
        next();
        }
    };
};
