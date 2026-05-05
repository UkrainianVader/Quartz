const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./db/dbOperations');
const { requireApiAuth, requireApiAdmin } = require('./middleware/auth');

const router = express.Router();

router.post('/api/users/add', requireApiAuth, requireApiAdmin, (req, res) => {
    const saltRounds = 10;
    const { username, password, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, saltRounds);
    const user = { username, password: hashedPassword, role };

    db.insert('users', '(username, password, role) VALUES (?, ?, ?)', user, (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Server error' });
        }

        return res.json({ message: 'User created' });
    });
});

router.post('/api/users/delete', requireApiAuth, requireApiAdmin, (req, res) => {
    const userId = Number(req.body.id ?? req.body.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: 'Invalid user id' });
    }

    if (userId === 1) {
        return res.status(400).json({ message: 'Ви не можете видалити адміністратора за замовчуванням!' });
    }

    db.remove('users', 'id', { id: userId }, (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Server error' });
        }

        return res.json({ message: 'User deleted' });
    });
});

module.exports = router;
