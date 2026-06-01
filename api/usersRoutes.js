const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/dbOperations');
const { requireApiAuth, requireApiAdmin } = require('../middleware/auth');

const router = express.Router();

const readRows = (table, columns) => new Promise((resolve, reject) => {
    db.read(table, columns, (err, rows) => {
        if (err) {
            return reject(err);
        }

        return resolve(rows);
    });
});

const updateRow = (table, data) => new Promise((resolve, reject) => {
    db.update(table, data, (err, result) => {
        if (err) {
            return reject(err);
        }

        return resolve(result);
    });
});

router.post('/api/users/add', requireApiAuth, requireApiAdmin, (req, res) => {
    const saltRounds = 10;
    const { username, password, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, saltRounds);
    const user = { username, password: hashedPassword, role, tutor_id: null };

    db.insert('users', '(username, password, role, tutor_id) VALUES (?, ?, ?, ?)', user, (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: 'Server error' });
        }

        return res.json({ message: 'User created' });
    });
});

router.post('/api/users/bulk-assign-tutor', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const tutorId = Number(req.body.tutorId);
        const studentIds = Array.isArray(req.body.studentIds)
            ? [...new Set(req.body.studentIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
            : [];

        if (!Number.isInteger(tutorId) || tutorId <= 0) {
            return res.status(400).json({ message: 'Invalid tutor id' });
        }

        if (!studentIds.length) {
            return res.status(400).json({ message: 'No students selected' });
        }

        const users = await readRows('users', 'id, username, role, tutor_id');
        const tutor = users.find((user) => Number(user.id) === tutorId);

        if (!tutor || tutor.role !== 'tutor') {
            return res.status(400).json({ message: 'Selected user is not a tutor' });
        }

        const assigned = [];
        const skipped = [];

        for (const studentId of studentIds) {
            const student = users.find((user) => Number(user.id) === studentId);

            if (!student || student.role !== 'user') {
                skipped.push(studentId);
                continue;
            }

            await updateRow('users', { id: studentId, tutor_id: tutorId });
            assigned.push(studentId);
        }

        return res.json({
            message: 'Students assigned to tutor',
            assigned,
            skipped
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
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
