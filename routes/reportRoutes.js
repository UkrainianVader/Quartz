const express = require('express');
const db = require('../db/dbOperations');
const { requireAuth, requireAdmin, requireApiAuth, requireApiAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/warehouse-report', requireAuth, requireAdmin, (req, res) => {
    db.read('components', '*', (err, equipment) => {
        if (err) {
            console.error(err);
            return res.status(500).send('DB error');
        }
        res.render('warehouseReport', { 
            totalEquipment: equipment.length,
            damagedEquipment: equipment.filter(c => c.status === 'ремонт').length,
            assignedEquipment: equipment.filter(c => c.status === 'призначене').length,
            freeEquipment: equipment.filter(c => c.status === 'вільне').length,
            equipment,
            user: req.session.user });
    });
});

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

module.exports = router;