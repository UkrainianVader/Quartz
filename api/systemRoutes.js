const express = require('express');
const { getServerAccessInfo } = require('../utils/networkInfo');

const router = express.Router();

router.get('/api/server-info', (req, res) => {
    const port = req.app.get('port') || process.env.PORT || 3000;

    return res.json(getServerAccessInfo(port));
});

module.exports = router;