const { plugin, logger, pluginPath, resourcesPath } = require("@eniac/flexdesigner");
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');

// Store active tasks for each device
const tasks = {};

/**
 * Called when device status changes
 */
plugin.on('device.status', (devices) => {
    logger.info('Device status changed:', devices);
    for (let device of devices) {
        if (device.status === 'disconnected') {
            // Clean up tasks for disconnected device
            if (tasks[device.serialNumber]) {
                for (let key in tasks[device.serialNumber]) {
                    clearInterval(tasks[device.serialNumber][key]);
                }
            }
            delete tasks[device.serialNumber];
        }
    }
});

/**
 * Called when a plugin key is loaded
 */
plugin.on('plugin.alive', (payload) => {
    logger.info('Plugin alive:', payload);
    const data = payload.keys;
    const serialNumber = payload.serialNumber;

    // 1. Stop all previous tasks for this device
    if (tasks[serialNumber]) {
        for (let key in tasks[serialNumber]) {
            clearInterval(tasks[serialNumber][key]);
        }
    } else {
        tasks[serialNumber] = {};
    }

    // 2. Start new tasks
    for (let key of data) {
        if (key.cid === 'com.benhussenet.apidisplay.apiread') {
            // Initialize the key with default display
            key.style.showIcon = false;
            key.style.showTitle = true;
            key.title = 'Loading...';
            plugin.draw(serialNumber, key, 'draw');

            // Start periodic updates
            const interval = parseInt(key.data.updateInterval) || 30000; // Default 30 seconds
            tasks[serialNumber][key.uid] = setInterval(() => {
                updateApiValue(serialNumber, key);
            }, interval);
        }
    }
});

/**
 * Update API value and render it
 */
async function updateApiValue(serialNumber, key) {
    try {
        const headers = getAuthHeaders(key.data);
        const response = await fetch(key.data.apiUrl, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const value = getJsonValue(data, key.data.valuePath || '$.total');
        
        // Update the key display
        key.title = value.toString();
        plugin.draw(serialNumber, key, 'draw');
    } catch (error) {
        logger.error('Error updating API value:', error);
        key.title = 'Error';
        plugin.draw(serialNumber, key, 'draw');
    }
}

/**
 * Called when user interacts with a key
 */
plugin.on('plugin.data', (payload) => {
    logger.info('Received plugin.data:', payload);
    const data = payload.data;
    const serialNumber = payload.serialNumber;

    if (data.key.cid === 'com.benhussenet.apidisplay.apiread') {
        // Force an immediate update when clicked
        updateApiValue(serialNumber, data.key);
    }
});

/**
 * Called when a key is removed
 */
plugin.on('plugin.remove', (payload) => {
    const serialNumber = payload.serialNumber;
    const uid = payload.uid;

    if (tasks[serialNumber] && tasks[serialNumber][uid]) {
        clearInterval(tasks[serialNumber][uid]);
        delete tasks[serialNumber][uid];
    }
});

/**
 * Get authentication headers based on configuration
 */
function getAuthHeaders(data) {
    const headers = {
        'Content-Type': 'application/json'
    };

    switch (data.authType) {
        case 'basic':
            if (data.username && data.password) {
                const credentials = Buffer.from(`${data.username}:${data.password}`).toString('base64');
                headers['Authorization'] = `Basic ${credentials}`;
            }
            break;
        case 'bearer':
            if (data.token) {
                headers['Authorization'] = `Bearer ${data.token}`;
            }
            break;
    }

    return headers;
}

/**
 * Extract value from JSON using path
 */
function getJsonValue(obj, path) {
    const parts = path.replace('$.', '').split('.');
    let current = obj;
    
    for (const part of parts) {
        if (current === undefined || current === null) {
            throw new Error(`Path ${path} not found in response`);
        }
        current = current[part];
    }
    
    return current;
}

// Connect to flexdesigner and start the plugin
plugin.start(); 