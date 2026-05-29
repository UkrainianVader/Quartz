const express = require('express');
const fs = require('fs');
const path = require('path');
const { getServerAccessInfo } = require('../utils/networkInfo');

const router = express.Router();
const projectRoot = path.resolve(__dirname, '..');

const getApkInfo = () => {
    const rootEntries = fs.readdirSync(projectRoot, { withFileTypes: true });
    const apkFiles = rootEntries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.apk'))
        .map((entry) => {
            const filePath = path.join(projectRoot, entry.name);
            const fileStats = fs.statSync(filePath);

            return {
                fileName: entry.name,
                filePath,
                modifiedAt: fileStats.mtimeMs
            };
        })
        .sort((left, right) => right.modifiedAt - left.modifiedAt);

    return apkFiles[0] || null;
};

router.get('/api/server-info', (req, res) => {
    const port = req.app.get('port') || process.env.PORT || 3000;

    return res.json(getServerAccessInfo(port));
});

router.get('/api/mobile-companion', (_req, res) => {
    try {
        const apkInfo = getApkInfo();

        if (!apkInfo) {
            return res.json({
                available: false,
                fileName: null,
                downloadPath: null
            });
        }

        return res.json({
            available: true,
            fileName: apkInfo.fileName,
            downloadPath: '/api/mobile-companion/download'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Failed to read project root' });
    }
});

router.get('/api/mobile-companion/download', (_req, res) => {
    try {
        const apkInfo = getApkInfo();

        if (!apkInfo) {
            return res.status(404).json({ message: 'APK file not found in project root' });
        }

        return res.download(apkInfo.filePath, apkInfo.fileName);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Failed to download APK' });
    }
});

module.exports = router;