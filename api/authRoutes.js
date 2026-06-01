const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/dbOperations');

const router = express.Router();

const buildUserPayload = (user) => ({
    id: user.id,
    username: user.username,
    role: user.role,
    tutorId: user.tutor_id ?? null
});

router.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    db.read('users', '*', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'DB error' });
        }

        const matchedUser = results.find((user) => {
            const dbUsername = user.username || user.login;
            return dbUsername === username;
        });

        if (!matchedUser) {
            return res.status(401).json({ message: 'Невірний логін або пароль' });
        }

        const isMatch = bcrypt.compareSync(password, matchedUser.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Невірний логін або пароль' });
        }

        req.session.user = buildUserPayload(matchedUser);
        return req.session.save(() => res.json({ user: buildUserPayload(matchedUser) }));
    });
});

router.get('/api/auth/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    return res.json({ user: req.session.user });
});

router.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Server error' });
        }

        res.clearCookie('connect.sid');
        return res.json({ message: 'Logged out' });
    });
});

module.exports = router;
