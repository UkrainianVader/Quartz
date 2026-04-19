const express = require('express');
const db = require('../db/dbOperations');
const { requireAuth, requireApiAuth } = require('../middleware/auth');

const router = express.Router();

const buildDashboardPayload = (req, components, usersResults, usageResults) => {
    const assignedEquipmentIds = usageResults
        .filter((entry) => entry.date_returned === null)
        .map((entry) => Number(entry.equipment_id));

    const userAssignedEquipmentIds = usageResults
        .filter((entry) => entry.date_returned === null && Number(entry.user_id) === Number(req.session.user.id))
        .map((entry) => Number(entry.equipment_id));

    const assignmentByEquipmentId = assignedEquipmentIds.reduce((acc, equipmentId) => {
        const assignment = usageResults.find((entry) => Number(entry.equipment_id) === equipmentId && entry.date_returned === null);
        if (!assignment) {
            acc[equipmentId] = null;
            return acc;
        }

        const matchedUser = usersResults.find((user) => Number(user.id) === Number(assignment.user_id));
        acc[equipmentId] = matchedUser ? matchedUser.username : (assignment.username || 'Видалений користувач');
        return acc;
    }, {});

    const warehouseReport = req.session.user.role === 'admin'
        ? {
            totalEquipment: components.length,
            damagedEquipment: components.filter((c) => c.status === 'ремонт').length,
            assignedEquipment: components.filter((c) => c.status === 'призначене').length,
            freeEquipment: components.filter((c) => c.status === 'вільне').length,
            equipment: components
        }
        : null;

    return {
        user: req.session.user,
        items: req.session.user.role === 'admin'
            ? components
            : userAssignedEquipmentIds
                .map((id) => components.find((item) => Number(item.id) === Number(id)))
                .filter((item) => item),
        users: usersResults,
        assignedEquipmentIds,
        assignmentByEquipmentId,
        warehouseReport
    };
};

router.get('/mainpage', requireAuth, (req, res) => {
    db.read('components', '*', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('DB error');
        }

        db.read('users', 'id, username, role', (usersErr, usersResults) => {
            if (usersErr) {
                console.error(usersErr);
                return res.status(500).send('DB error');
            }

            db.read('usage_history', 'id, equipment_id, user_id, username, date_returned', (usageErr, usageResults) => {
                if (usageErr) {
                    console.error(usageErr);
                    return res.status(500).send('DB error');
                }

                const assignedEquipmentIds = usageResults
                    .filter((entry) => entry.date_returned === null)
                    .map((entry) => Number(entry.equipment_id));

                const userAssignedEquipmentIds = usageResults
                    .filter((entry) => entry.date_returned === null && Number(entry.user_id) === Number(req.session.user.id))
                    .map((entry) => Number(entry.equipment_id));

                const assignmentByEquipmentId = assignedEquipmentIds.reduce((acc, equipmentId) => {
                    const assignment = usageResults.find((entry) => Number(entry.equipment_id) === equipmentId && entry.date_returned === null);
                    if (!assignment) {
                        acc[equipmentId] = null;
                        return acc;
                    }

                    const matchedUser = usersResults.find((user) => Number(user.id) === Number(assignment.user_id));
                    acc[equipmentId] = matchedUser ? matchedUser.username : (assignment.username || 'Видалений користувач');
                    return acc;
                }, {});

                const warehouseReport = req.session.user.role === 'admin'
                    ? {
                        totalEquipment: results.length,
                        damagedEquipment: results.filter((c) => c.status === 'ремонт').length,
                        assignedEquipment: results.filter((c) => c.status === 'призначене').length,
                        freeEquipment: results.filter((c) => c.status === 'вільне').length,
                        equipment: results
                    }
                    : null;


                return res.render('mainpage', {
                    items: req.session.user.role === 'admin'
                        ? results
                        : userAssignedEquipmentIds
                            .map((id) => results.find((item) => Number(item.id) === Number(id)))
                            .filter((item) => item),
                    users: usersResults,
                    assignedEquipmentIds,
                    assignmentByEquipmentId,
                    warehouseReport,
                    user: req.session.user
                });
            });
        });
    });
});

router.get('/api/dashboard', requireApiAuth, (req, res) => {
    db.read('components', '*', (err, components) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'DB error' });
        }

        db.read('users', 'id, username, role', (usersErr, usersResults) => {
            if (usersErr) {
                console.error(usersErr);
                return res.status(500).json({ message: 'DB error' });
            }

            db.read('usage_history', 'id, equipment_id, user_id, username, date_returned', (usageErr, usageResults) => {
                if (usageErr) {
                    console.error(usageErr);
                    return res.status(500).json({ message: 'DB error' });
                }

                return res.json(buildDashboardPayload(req, components, usersResults, usageResults));
            });
        });
    });
});

module.exports = router;
