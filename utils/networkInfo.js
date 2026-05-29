const os = require('os');

const VIRTUAL_INTERFACE_PATTERNS = /virtual|vmware|vbox|host-only|nat|loopback|pseudo|docker|hyper-v|wsl/i;
const VIRTUAL_MAC_PREFIXES = ['08:00:27', '0a:00:27', '00:15:5d', '00:50:56', '52:54:00'];

const isVirtualNetworkInterface = (name, mac) => {
    const normalizedName = String(name || '');
    const normalizedMac = String(mac || '').toLowerCase();

    return VIRTUAL_INTERFACE_PATTERNS.test(normalizedName)
        || VIRTUAL_MAC_PREFIXES.some((prefix) => normalizedMac.startsWith(prefix));
};

const getLocalIPv4Addresses = () => {
    const networkInterfaces = os.networkInterfaces();
    const candidates = [];

    Object.entries(networkInterfaces).forEach(([name, interfaces]) => {
        (interfaces || []).forEach((networkInterface) => {
            if (!networkInterface || networkInterface.family !== 'IPv4' || networkInterface.internal) {
                return;
            }

            candidates.push({
                name,
                address: networkInterface.address,
                mac: networkInterface.mac
            });
        });
    });

    const preferredCandidates = candidates.filter((candidate) => !isVirtualNetworkInterface(candidate.name, candidate.mac));
    const selectedCandidates = preferredCandidates.length > 0 ? preferredCandidates : candidates;

    return selectedCandidates
        .map((candidate) => candidate.address)
        .filter((address, index, addresses) => addresses.indexOf(address) === index);
};

const getServerAccessInfo = (port) => {
    const normalizedPort = Number(port) || 3000;
    const localIps = getLocalIPv4Addresses();
    const localUrls = localIps.map((ip) => `http://${ip}:${normalizedPort}`);

    return {
        port: normalizedPort,
        localIps,
        localUrls,
        localhostUrl: `http://localhost:${normalizedPort}`,
        primaryUrl: localUrls[0] || `http://localhost:${normalizedPort}`
    };
};

module.exports = {
    getLocalIPv4Addresses,
    getServerAccessInfo
};