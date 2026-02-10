// middlewares/validate.js
export const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const data = req[source];

        const result = schema.safeParse(data);

        if (!result.success) {
        return res.status(400).json({
            error: 'Datos inválidos',
            detalles: result.error.issues.map(i => ({
            campo: i.path.join('.'),
            mensaje: i.message
            }))
        });
        }

        if (source === 'query') {
            Object.assign(req.query, result.data);
        } else {
            req[source] = result.data;
        }

        next();
    };
};
