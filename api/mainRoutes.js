const express = require('express');
const db = require('../db/dbOperations');
const { requireApiAuth } = require('../middleware/auth');

const router = express.Router();

const buildDashboardPayload = (req, components, usersResults, usageResults) => {
    const currentUser = req.session.user;
    const usersById = new Map(usersResults.map((user) => [Number(user.id), user]));

    const assignedEquipmentIds = usageResults
        .filter((entry) => entry.date_returned === null)
        .map((entry) => Number(entry.equipment_id));

    const visibleEquipmentIds = usageResults
        .filter((entry) => {
            if (entry.date_returned !== null) {
                return false;
            }

            if (currentUser.role === 'admin') {
                return true;
            }

            if (currentUser.role === 'tutor') {
                if (Number(entry.user_id) === Number(currentUser.id)) {
                    return true;
                }

                const holder = usersById.get(Number(entry.user_id));
                return Number(holder?.tutor_id) === Number(currentUser.id);
            }

            return Number(entry.user_id) === Number(currentUser.id);
        })
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

    const warehouseReport = currentUser.role === 'admin'
        ? {
            totalEquipment: components.length,
            damagedEquipment: components.filter((c) => c.status === 'ремонт').length,
            assignedEquipment: components.filter((c) => c.status === 'призначене').length,
            freeEquipment: components.filter((c) => c.status === 'вільне').length,
            equipment: components
        }
        : null;

    return {
        user: currentUser,
        items: currentUser.role === 'admin'
            ? components
            : visibleEquipmentIds
                .map((id) => components.find((item) => Number(item.id) === Number(id)))
                .filter((item) => item),
        users: usersResults,
        assignedEquipmentIds,
        assignmentByEquipmentId,
        assignmentUserIdByEquipmentId: assignedEquipmentIds.reduce((acc, equipmentId) => {
            const assignment = usageResults.find((entry) => Number(entry.equipment_id) === equipmentId && entry.date_returned === null);
            acc[equipmentId] = assignment ? Number(assignment.user_id) : null;
            return acc;
        }, {}),
        warehouseReport
    };
};

router.get('/api/dashboard', requireApiAuth, (req, res) => {
    db.read('components', '*', (err, components) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'DB error' });
        }

        db.read('users', 'id, username, role, tutor_id', (usersErr, usersResults) => {
            if (usersErr) {
                console.error(usersErr);
                return res.status(500).json({ message: 'DB error' });
            }

            db.read('usage_history', 'id, equipment_id, user_id, username, date_returned, returned_broken', (usageErr, usageResults) => {
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
