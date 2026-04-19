const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/loginpage');
    }
    next();
};

const requireApiAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).send('Forbidden');
    }
    next();
};

const requireApiAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    next();
};

module.exports = {
    requireAuth,
    requireAdmin,
    requireApiAuth,
    requireApiAdmin
};
