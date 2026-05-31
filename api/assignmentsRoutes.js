const express = require('express');
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

const insertRow = (table, columns, data) => new Promise((resolve, reject) => {
    db.insert(table, columns, data, (err, result) => {
        if (err) {
            return reject(err);
        }

        return resolve(result);
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

const normalizeIds = (value) => {
    const values = Array.isArray(value) ? value : [value];

    return [...new Set(values.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0))];
};

const getActiveAssignment = (usageRows, componentId) => usageRows
    .filter((row) => Number(row.equipment_id) === Number(componentId) && row.date_returned === null)
    .sort((a, b) => b.id - a.id)[0] || null;

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

        db.read('usage_history', 'id, equipment_id, date_returned', (usageErr, usageRows) => {
            if (usageErr) {
                console.error(usageErr);
                return res.status(500).json({ message: 'Server error' });
            }

            const activeAssignment = getActiveAssignment(usageRows, id);
            if (activeAssignment) {
                return res.status(400).json({ message: 'Component is already assigned' });
            }

            const usageEntry = {
                equipment_id: id,
                user_id: userId,
                username: selectedUser.username,
                returned_broken: 0
            };

            db.insert('usage_history', '(equipment_id, user_id, username, returned_broken)', usageEntry, (err) => {
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
});

router.post('/api/assignments/bulk-assign', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const componentIds = normalizeIds(req.body.ids ?? req.body.id);
        const userId = Number(req.body.userId);

        if (!componentIds.length) {
            return res.status(400).json({ message: 'No components selected' });
        }

        const usersRows = await readRows('users', 'id, username, role');
        const selectedUser = usersRows.find((user) => Number(user.id) === userId);

        if (!selectedUser) {
            return res.status(400).json({ message: 'Selected user not found' });
        }

        if (selectedUser.role === 'admin') {
            return res.status(400).json({ message: 'Cannot assign component to admin user' });
        }

        const usageRows = await readRows('usage_history', 'id, equipment_id, date_returned');
        const assigned = [];
        const skipped = [];

        for (const componentId of componentIds) {
            const activeAssignment = getActiveAssignment(usageRows, componentId);
            if (activeAssignment) {
                skipped.push(componentId);
                continue;
            }

            await insertRow('usage_history', '(equipment_id, user_id, username, returned_broken)', {
                equipment_id: componentId,
                user_id: userId,
                username: selectedUser.username,
                returned_broken: 0
            });

            await updateRow('components', { id: componentId, status: 'призначене' });
            assigned.push(componentId);
        }

        return res.json({
            message: 'Bulk assignment completed',
            assigned,
            skipped
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
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
        db.update('usage_history', { id: latestAssignment.id, date_returned: new Date(), returned_broken: 0 }, (updateErr) => {
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

router.post('/api/assignments/bulk-unassign', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const componentIds = normalizeIds(req.body.ids ?? req.body.id);

        if (!componentIds.length) {
            return res.status(400).json({ message: 'No components selected' });
        }

        const usageRows = await readRows('usage_history', 'id, equipment_id, date_returned');
        const unassigned = [];
        const skipped = [];

        for (const componentId of componentIds) {
            const activeAssignment = getActiveAssignment(usageRows, componentId);
            if (!activeAssignment) {
                skipped.push(componentId);
                continue;
            }

            await updateRow('usage_history', {
                id: activeAssignment.id,
                date_returned: new Date(),
                returned_broken: 0
            });
            await updateRow('components', { id: componentId, status: 'вільне' });
            unassigned.push(componentId);
        }

        return res.json({
            message: 'Bulk unassignment completed',
            unassigned,
            skipped
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

router.post('/api/assignments/bulk-return-broken', requireApiAuth, requireApiAdmin, async (req, res) => {
    try {
        const componentIds = normalizeIds(req.body.ids ?? req.body.id);

        if (!componentIds.length) {
            return res.status(400).json({ message: 'No components selected' });
        }

        const usageRows = await readRows('usage_history', 'id, equipment_id, date_returned');
        const returned = [];
        const skipped = [];

        for (const componentId of componentIds) {
            const activeAssignment = getActiveAssignment(usageRows, componentId);

            if (!activeAssignment) {
                skipped.push(componentId);
                continue;
            }

            await updateRow('usage_history', {
                id: activeAssignment.id,
                date_returned: new Date(),
                returned_broken: 1
            });
            await updateRow('components', { id: componentId, status: 'ремонт' });
            returned.push(componentId);
        }

        return res.json({
            message: 'Bulk broken return completed',
            returned,
            skipped
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
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

        db.update('usage_history', { id: activeAssignment.id, date_returned: new Date(), returned_broken: 0 }, (updateErr) => {
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

router.post('/api/assignments/bulk-return', requireApiAuth, async (req, res) => {
    try {
        const componentIds = normalizeIds(req.body.ids ?? req.body.id);
        const currentUserId = Number(req.session.user.id);

        if (!componentIds.length) {
            return res.status(400).json({ message: 'No components selected' });
        }

        const usageRows = await readRows('usage_history', 'id, equipment_id, user_id, date_returned');
        const returned = [];
        const skipped = [];

        for (const componentId of componentIds) {
            const activeAssignment = getActiveAssignment(usageRows, componentId);

            if (!activeAssignment || Number(activeAssignment.user_id) !== currentUserId) {
                skipped.push(componentId);
                continue;
            }

            await updateRow('usage_history', {
                id: activeAssignment.id,
                date_returned: new Date(),
                returned_broken: 0
            });
            await updateRow('components', { id: componentId, status: 'вільне' });
            returned.push(componentId);
        }

        return res.json({
            message: 'Bulk return completed',
            returned,
            skipped
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
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

        db.update('usage_history', { id: activeAssignment.id, date_returned: new Date(), returned_broken: 1 }, (updateErr) => {
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
