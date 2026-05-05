const express = require('express');
const db = require('./db/dbOperations');
const { requireApiAuth, requireApiAdmin } = require('./middleware/auth');

const router = express.Router();

router.post('/api/assignments/assign', requireApiAuth, requireApiAdmin, (req, res) => {
    const { id, userId } = req.body;

    db.read('users', 'id, username, role', (usersErr, usersRows) => {
        if (usersErr) {
            console.error(usersErr);
            return res.status(500).json({ message: 'Server error' });
        }

        const selectedUser = usersRows.find((u) => Number(u.id) === Number(userId));
        if (!selectedUser) {
            return res.status(400).json({ message: 'Selected user not found' });
        }

        if (selectedUser.role === 'admin') {
            return res.status(400).json({ message: 'Cannot assign component to admin user' });
        }

        const usageEntry = {
            equipment_id: id,
            user_id: userId,
            username: selectedUser.username
        };

        db.insert('usage_history', '(equipment_id, user_id, username)', usageEntry, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Server error' });
            }

            db.update('components', { id, status: 'призначене' }, (updateErr) => {
                if (updateErr) {
                    console.error(updateErr);
                    return res.status(500).json({ message: 'Server error' });
                }

                return res.json({ message: 'Component assigned' });
            });
        });
    });
});

router.post('/api/assignments/unassign', requireApiAuth, requireApiAdmin, (req, res) => {
    const { id } = req.body;

    db.read('usage_history', 'id, equipment_id, date_returned', (err, usageRows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Server error' });
        }

        const activeAssignments = usageRows
            .filter((row) => Number(row.equipment_id) === Number(id) && row.date_returned === null)
            .sort((a, b) => b.id - a.id);

        if (!activeAssignments.length) {
            return res.json({ message: 'No active assignment' });
        }

        const latestAssignment = activeAssignments[0];
        db.update('usage_history', { id: latestAssignment.id, date_returned: new Date() }, (updateErr) => {
            if (updateErr) {
                console.error(updateErr);
                return res.status(500).json({ message: 'Server error' });
            }

            db.update('components', { id, status: 'вільне' }, (componentErr) => {
                if (componentErr) {
                    console.error(componentErr);
                    return res.status(500).json({ message: 'Server error' });
                }

                return res.json({ message: 'Component unassigned' });
            });
        });
    });
});

router.post('/api/assignments/return', requireApiAuth, (req, res) => {
    const componentId = Number(req.body.id);
    const currentUserId = Number(req.session.user.id);

    if (!Number.isInteger(componentId) || componentId <= 0) {
        return res.status(400).json({ message: 'Invalid component id' });
    }

    db.read('usage_history', 'id, equipment_id, user_id, date_returned', (err, usageRows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Server error' });
        }

        const activeAssignment = usageRows
            .filter((row) => Number(row.equipment_id) === componentId && row.date_returned === null)
            .sort((a, b) => b.id - a.id)
            .find((row) => Number(row.user_id) === currentUserId);

        if (!activeAssignment) {
            return res.status(403).json({ message: 'Component is not assigned to current user' });
        }

        db.update('usage_history', { id: activeAssignment.id, date_returned: new Date() }, (updateErr) => {
            if (updateErr) {
                console.error(updateErr);
                return res.status(500).json({ message: 'Server error' });
            }

            db.update('components', { id: componentId, status: 'вільне' }, (componentErr) => {
                if (componentErr) {
                    console.error(componentErr);
                    return res.status(500).json({ message: 'Server error' });
                }

                return res.json({ message: 'Component returned' });
            });
        });
    });
});

router.post('/api/assignments/return-broken', requireApiAuth, (req, res) => {
    const componentId = Number(req.body.id);
    const currentUserId = Number(req.session.user.id);

    if (!Number.isInteger(componentId) || componentId <= 0) {
        return res.status(400).json({ message: 'Invalid component id' });
    }

    db.read('usage_history', 'id, equipment_id, user_id, date_returned', (err, usageRows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Server error' });
        }

        const activeAssignment = usageRows
            .filter((row) => Number(row.equipment_id) === componentId && row.date_returned === null)
            .sort((a, b) => b.id - a.id)
            .find((row) => Number(row.user_id) === currentUserId);

        if (!activeAssignment) {
            return res.status(403).json({ message: 'Component is not assigned to current user' });
        }

        db.update('usage_history', { id: activeAssignment.id, date_returned: new Date() }, (updateErr) => {
            if (updateErr) {
                console.error(updateErr);
                return res.status(500).json({ message: 'Server error' });
            }

            db.update('components', { id: componentId, status: 'ремонт' }, (componentErr) => {
                if (componentErr) {
                    console.error(componentErr);
                    return res.status(500).json({ message: 'Server error' });
                }

                return res.json({ message: 'Component returned broken' });
            });
        });
    });
});

module.exports = router;
