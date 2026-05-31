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

const resolveComponent = (components, equipmentId) => components.find((component) => Number(component.id) === Number(equipmentId)) || null;

const buildUserReport = (user, components, usageRows) => {
    const userHistory = usageRows
        .filter((entry) => Number(entry.user_id) === Number(user.id)
            || String(entry.username || '').toLowerCase() === String(user.username || '').toLowerCase())
        .sort((a, b) => new Date(b.date_taken).getTime() - new Date(a.date_taken).getTime());

    const history = userHistory.map((entry) => {
        const component = resolveComponent(components, entry.equipment_id);

        return {
            id: entry.id,
            equipmentId: Number(entry.equipment_id),
            name: component?.name || entry.username || 'Невідомий компонент',
            type: component?.type || '',
            serial: component?.serial || '',
            status: component?.status || '',
            description: component?.description || '',
            dateTaken: entry.date_taken,
            dateReturned: entry.date_returned,
            returnedBroken: Boolean(entry.returned_broken)
        };
    });

    const currentComponents = history
        .filter((entry) => entry.dateReturned === null)
        .map((entry) => ({
            id: entry.equipmentId,
            name: entry.name,
            type: entry.type,
            serial: entry.serial,
            status: entry.status,
            description: entry.description
        }));

    const brokenReturns = history.filter((entry) => entry.returnedBroken).length;

    return {
        user,
        currentComponents,
        history,
        totals: {
            totalAssignments: history.length,
            activeAssignments: currentComponents.length,
            returnedAssignments: history.filter((entry) => entry.dateReturned !== null).length,
            brokenReturns
        }
    };
};

router.get('/api/report/warehouse', requireApiAuth, requireApiAdmin, (req, res) => {
    db.read('components', '*', (err, equipment) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'DB error' });
        }

        return res.json({
            report: {
                totalEquipment: equipment.length,
                damagedEquipment: equipment.filter(c => c.status === 'ремонт').length,
                assignedEquipment: equipment.filter(c => c.status === 'призначене').length,
                freeEquipment: equipment.filter(c => c.status === 'вільне').length,
                equipment
            }
        });
    });
});

router.get('/api/report/user/:userId', requireApiAuth, async (req, res) => {
    try {
        const requestedUserId = Number(req.params.userId);
        const currentUserId = Number(req.session.user.id);
        const isAdmin = req.session.user.role === 'admin';

        if (!Number.isInteger(requestedUserId) || requestedUserId <= 0) {
            return res.status(400).json({ message: 'Invalid user id' });
        }

        if (!isAdmin && requestedUserId !== currentUserId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const [users, components, usageRows] = await Promise.all([
            readRows('users', 'id, username, role'),
            readRows('components', 'id, name, type, serial, status, description'),
            readRows('usage_history', 'id, equipment_id, user_id, username, date_taken, date_returned, returned_broken')
        ]);

        const user = users.find((row) => Number(row.id) === requestedUserId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.json({
            report: buildUserReport(user, components, usageRows)
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'DB error' });
    }
});

module.exports = router;
