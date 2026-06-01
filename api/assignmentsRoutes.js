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

const getUserById = (usersRows, userId) => usersRows.find((user) => Number(user.id) === Number(userId)) || null;

const getActiveAssignment = (usageRows, componentId) => usageRows
    .filter((row) => Number(row.equipment_id) === Number(componentId) && row.date_returned === null)
    .sort((a, b) => b.id - a.id)[0] || null;

const isTutorStudent = (usersRows, tutorId, studentUserId) => {
    const student = getUserById(usersRows, studentUserId);
    return Boolean(student) && student.role === 'user' && Number(student.tutor_id) === Number(tutorId);
};

const processReturn = async (componentId, currentUser, returnedBroken) => {
    const usersRows = await readRows('users', 'id, username, role, tutor_id');
    const usageRows = await readRows('usage_history', 'id, equipment_id, user_id, assigned_by_user_id, date_returned');
    const activeAssignment = getActiveAssignment(usageRows, componentId);

    if (!activeAssignment) {
        const error = new Error('Component is not assigned to current user');
        error.statusCode = 403;
        throw error;
    }

    const holder = getUserById(usersRows, activeAssignment.user_id);
    let nextHolderId = null;

    if (currentUser.role === 'user') {
        if (Number(activeAssignment.user_id) !== Number(currentUser.id)) {
            const error = new Error('Component is not assigned to current user');
            error.statusCode = 403;
            throw error;
        }

        nextHolderId = Number(activeAssignment.assigned_by_user_id) || null;
    } else if (currentUser.role === 'tutor') {
        if (Number(activeAssignment.user_id) === Number(currentUser.id)) {
            nextHolderId = null;
        } else if (holder && holder.role === 'user' && Number(holder.tutor_id) === Number(currentUser.id)) {
            nextHolderId = Number(currentUser.id);
        } else {
            const error = new Error('Component is not assigned to one of your students');
            error.statusCode = 403;
            throw error;
        }
    } else if (currentUser.role === 'admin') {
        if (Number(activeAssignment.user_id) !== Number(currentUser.id)) {
            const error = new Error('Component is not assigned to current user');
            error.statusCode = 403;
            throw error;
        }

        nextHolderId = null;
    } else {
        const error = new Error('Forbidden');
        error.statusCode = 403;
        throw error;
    }

    await updateRow('usage_history', {
        id: activeAssignment.id,
        date_returned: new Date(),
        returned_broken: returnedBroken ? 1 : 0
    });

    if (nextHolderId) {
        const nextHolder = getUserById(usersRows, nextHolderId);
        if (!nextHolder) {
            const error = new Error('Return target not found');
            error.statusCode = 400;
            throw error;
        }

        await insertRow('usage_history', '(equipment_id, user_id, assigned_by_user_id, username, returned_broken)', {
            equipment_id: componentId,
            user_id: nextHolder.id,
            assigned_by_user_id: activeAssignment.user_id,
            username: nextHolder.username,
            returned_broken: returnedBroken ? 1 : 0
        });

        await updateRow('components', { id: componentId, status: returnedBroken ? 'ремонт' : 'призначене' });
        return;
    }

    await updateRow('components', { id: componentId, status: returnedBroken ? 'ремонт' : 'вільне' });
};

router.post('/api/assignments/assign', requireApiAuth, (req, res) => {
    const { id, userId } = req.body;
    const currentUser = req.session.user;

    db.read('users', 'id, username, role, tutor_id', (usersErr, usersRows) => {
        if (usersErr) {
            console.error(usersErr);
            return res.status(500).json({ message: 'Server error' });
        }

        const selectedUser = getUserById(usersRows, userId);
        if (!selectedUser) {
            return res.status(400).json({ message: 'Selected user not found' });
        }

        db.read('usage_history', 'id, equipment_id, user_id, date_returned', (usageErr, usageRows) => {
            if (usageErr) {
                console.error(usageErr);
                return res.status(500).json({ message: 'Server error' });
            }

            const activeAssignment = getActiveAssignment(usageRows, id);
            if (currentUser.role === 'admin') {
                if (selectedUser.role !== 'tutor') {
                    return res.status(400).json({ message: 'Administrators can assign components only to tutors' });
                }

                if (activeAssignment) {
                    return res.status(400).json({ message: 'Component is already assigned' });
                }
            } else if (currentUser.role === 'tutor') {
                if (!isTutorStudent(usersRows, currentUser.id, selectedUser.id)) {
                    return res.status(403).json({ message: 'You can assign components only to your students' });
                }

                if (!activeAssignment || Number(activeAssignment.user_id) !== Number(currentUser.id)) {
                    return res.status(400).json({ message: 'Component is not assigned to you' });
                }
            } else {
                return res.status(403).json({ message: 'Forbidden' });
            }

            const usageEntry = {
                equipment_id: id,
                user_id: userId,
                assigned_by_user_id: currentUser.id,
                username: selectedUser.username,
                returned_broken: 0
            };

            const finishAssignment = () => {
                db.insert('usage_history', '(equipment_id, user_id, assigned_by_user_id, username, returned_broken)', usageEntry, (err) => {
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
            };

            if (currentUser.role === 'tutor') {
                db.update('usage_history', { id: activeAssignment.id, date_returned: new Date(), returned_broken: 0 }, (closeErr) => {
                    if (closeErr) {
                        console.error(closeErr);
                        return res.status(500).json({ message: 'Server error' });
                    }

                    finishAssignment();
                });
                return;
            }

            finishAssignment();
        });
    });
});

router.post('/api/assignments/bulk-assign', requireApiAuth, async (req, res) => {
    try {
        const componentIds = normalizeIds(req.body.ids ?? req.body.id);
        const userId = Number(req.body.userId);
        const currentUser = req.session.user;

        if (!componentIds.length) {
            return res.status(400).json({ message: 'No components selected' });
        }

        const usersRows = await readRows('users', 'id, username, role, tutor_id');
        const selectedUser = getUserById(usersRows, userId);

        if (!selectedUser) {
            return res.status(400).json({ message: 'Selected user not found' });
        }

        const usageRows = await readRows('usage_history', 'id, equipment_id, user_id, date_returned');
        const assigned = [];
        const skipped = [];

        for (const componentId of componentIds) {
            const activeAssignment = getActiveAssignment(usageRows, componentId);

            if (currentUser.role === 'admin') {
                if (selectedUser.role !== 'tutor') {
                    return res.status(400).json({ message: 'Administrators can assign components only to tutors' });
                }

                if (activeAssignment) {
                    skipped.push(componentId);
                    continue;
                }

                await insertRow('usage_history', '(equipment_id, user_id, assigned_by_user_id, username, returned_broken)', {
                    equipment_id: componentId,
                    user_id: userId,
                    assigned_by_user_id: currentUser.id,
                    username: selectedUser.username,
                    returned_broken: 0
                });

                await updateRow('components', { id: componentId, status: 'призначене' });
                assigned.push(componentId);
                continue;
            }

            if (currentUser.role !== 'tutor') {
                return res.status(403).json({ message: 'Forbidden' });
            }

            if (!isTutorStudent(usersRows, currentUser.id, selectedUser.id)) {
                return res.status(403).json({ message: 'You can assign components only to your students' });
            }

            if (!activeAssignment || Number(activeAssignment.user_id) !== Number(currentUser.id)) {
                skipped.push(componentId);
                continue;
            }

            await updateRow('usage_history', {
                id: activeAssignment.id,
                date_returned: new Date(),
                returned_broken: 0
            });

            await insertRow('usage_history', '(equipment_id, user_id, assigned_by_user_id, username, returned_broken)', {
                equipment_id: componentId,
                user_id: userId,
                assigned_by_user_id: currentUser.id,
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

router.post('/api/assignments/return', requireApiAuth, async (req, res) => {
    const componentId = Number(req.body.id);

    if (!Number.isInteger(componentId) || componentId <= 0) {
        return res.status(400).json({ message: 'Invalid component id' });
    }

    try {
        await processReturn(componentId, req.session.user, false);
        return res.json({ message: 'Component returned' });
    } catch (error) {
        console.error(error);
        return res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
    }
});

router.post('/api/assignments/bulk-return', requireApiAuth, async (req, res) => {
    try {
        const componentIds = normalizeIds(req.body.ids ?? req.body.id);

        if (!componentIds.length) {
            return res.status(400).json({ message: 'No components selected' });
        }

        const returned = [];
        const skipped = [];

        for (const componentId of componentIds) {
            try {
                await processReturn(componentId, req.session.user, false);
                returned.push(componentId);
            } catch (error) {
                skipped.push(componentId);
                continue;
            }
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

router.post('/api/assignments/return-broken', requireApiAuth, async (req, res) => {
    const componentId = Number(req.body.id);

    if (!Number.isInteger(componentId) || componentId <= 0) {
        return res.status(400).json({ message: 'Invalid component id' });
    }

    try {
        await processReturn(componentId, req.session.user, true);
        return res.json({ message: 'Component returned broken' });
    } catch (error) {
        console.error(error);
        return res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
    }
});

module.exports = router;
