const express = require('express');
const db = require('../db/dbOperations');
const { requireAuth, requireApiAuth, requireApiAdmin } = require('../middleware/auth');

const router = express.Router();

const sendApiError = (res, error) => {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
};

router.post('/add-item', requireAuth, (req, res) => {
    const { name, type, serial, description, status } = req.body;
    const item = { name, type, serial, status, description };

    db.insert('components', '(name, type, serial, status, description)', item, (err) => {
        if (err) {
            return res.status(500).send(err);
        }
        return res.redirect('/');
    });
});

router.post('/api/components/add', requireApiAuth, requireApiAdmin, (req, res) => {
    const { name, type, serial, description, status } = req.body;
    const item = { name, type, serial, status, description };

    db.insert('components', '(name, type, serial, status, description)', item, (err) => {
        if (err) {
            return sendApiError(res, err);
        }

        return res.json({ message: 'Component added' });
    });
});

router.post('/update-item', requireAuth, (req, res) => {
    const { id, name, type, serial, status, description } = req.body;
    const item = { id, name, type, serial, status, description };

    db.update('components', item, (err) => {
        if (err) {
            return res.status(500).send('Server error');
        }
        return res.redirect('/');
    });
});

router.post('/api/components/update', requireApiAuth, requireApiAdmin, (req, res) => {
    const { id, name, type, serial, status, description } = req.body;
    const item = { id, name, type, serial, status, description };

    db.update('components', item, (err) => {
        if (err) {
            return sendApiError(res, err);
        }

        return res.json({ message: 'Component updated' });
    });
});

router.post('/fix-item', requireAuth, (req, res) => {
    const { id } = req.body;
    db.update('components', { id, status: 'вільне' }, (err) => {
        if (err) {
            return res.status(500).send('Server error');
        }
        return res.redirect('/');
    });
});

router.post('/api/components/fix', requireApiAuth, requireApiAdmin, (req, res) => {
    const { id } = req.body;

    db.update('components', { id, status: 'вільне' }, (err) => {
        if (err) {
            return sendApiError(res, err);
        }

        return res.json({ message: 'Component fixed' });
    });
});

router.post('/remove', requireAuth, (req, res) => {
    const { id } = req.body;
    db.remove('components', 'id', { id }, (err) => {
        if (err) {
            return res.status(500).send(err);
        }
        return res.redirect('/');
    });
});

router.post('/api/components/remove', requireApiAuth, requireApiAdmin, (req, res) => {
    const { id } = req.body;

    db.remove('components', 'id', { id }, (err) => {
        if (err) {
            return sendApiError(res, err);
        }

        return res.json({ message: 'Component removed' });
    });
});

module.exports = router;
