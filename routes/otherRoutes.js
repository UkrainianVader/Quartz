const express = require('express');
const db = require('../db/dbOperations');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const env = require('dotenv');
const { spawn } = require('child_process');
const { set } = require('express/lib/application');
env.config();
const router = express.Router();

router.post('/reset-db', requireAuth, requireAdmin, (req, res) => {
    const dbName = process.env.DB_NAME;

    // Видаляємо
    db.query(`DROP DATABASE IF EXISTS \`${dbName}\``, (err) => {
        if (err) return res.status(500).send(err);

        // ВІДРАЗУ СТВОРЮЄМО (це вирішить твою проблему з NO_DB)
        db.query(`CREATE DATABASE \`${dbName}\``, (err) => {
            if (err) return res.status(500).send(err);

            res.redirect('/mainpage');

            const child = spawn(process.argv[0], process.argv.slice(1), {
                detached: true,
                stdio: 'inherit'
            });
            child.unref();

            setTimeout(() => {
                process.exit(0);
            }, 500);
        });
    });
});
module.exports = router;