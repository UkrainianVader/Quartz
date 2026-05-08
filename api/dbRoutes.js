const express = require('express');
const db = require('../db/dbOperations');
const { requireApiAuth, requireApiAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/api/db/reset', requireApiAuth, requireApiAdmin, (req, res) => {
    db.reset((err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Server error' });
        }

        return res.json({ message: 'Database reset successfully' });
    });
});

module.exports = router;
