/**
 * Encryption Module - Story 6-4
 * Handles API key encryption/decryption using AES-256-GCM
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const SECRETS_DIR = path.join(process.cwd(), '.neuraldeck');
const SECRETS_FILE = path.join(SECRETS_DIR, 'secrets.enc');
const KEY_FILE = path.join(SECRETS_DIR, '.key');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

// Ensure secrets directory exists
async function ensureSecretsDir() {
    try {
        await fs.mkdir(SECRETS_DIR, { recursive: true, mode: 0o700 });
    } catch (err) {
        console.error('[ENCRYPTION] Failed to create secrets directory:', err.message);
        throw err;
    }
}

// Get or create encryption key
async function getEncryptionKey() {
    try {
        // Try to read existing key
        const keyData = await fs.readFile(KEY_FILE, 'utf-8');
        return Buffer.from(keyData, 'hex');
    } catch (err) {
        if (err.code === 'ENOENT') {
            // Generate new key
            const key = crypto.randomBytes(KEY_LENGTH);
            await ensureSecretsDir();
            await fs.writeFile(KEY_FILE, key.toString('hex'), { mode: 0o600 });
            console.log('[ENCRYPTION] Generated new encryption key');
            return key;
        }
        throw err;
    }
}

// Encrypt data
async function encrypt(plaintext) {
    if (!plaintext) {
        throw new Error('Plaintext is required');
    }
    
    const key = await getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return iv + authTag + encrypted
    return {
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        encrypted,
    };
}

// Decrypt data
async function decrypt(encryptedData) {
    if (!encryptedData || !encryptedData.iv || !encryptedData.authTag || !encryptedData.encrypted) {
        throw new Error('Invalid encrypted data format');
    }
    
    const key = await getEncryptionKey();
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    
    return decrypted;
}

// Store API keys (encrypted)
async function storeApiKeys(keys) {
    await ensureSecretsDir();
    
    const encryptedKeys = {};
    for (const [provider, apiKey] of Object.entries(keys)) {
        if (apiKey) {
            encryptedKeys[provider] = await encrypt(apiKey);
        }
    }
    
    const data = JSON.stringify(encryptedKeys, null, 2);
    await fs.writeFile(SECRETS_FILE, data, { mode: 0o600 });
}

// Load API keys (decrypted)
async function loadApiKeys() {
    try {
        const data = await fs.readFile(SECRETS_FILE, 'utf-8');
        const encryptedKeys = JSON.parse(data);
        
        const keys = {};
        for (const [provider, encryptedData] of Object.entries(encryptedKeys)) {
            try {
                keys[provider] = await decrypt(encryptedData);
            } catch (err) {
                console.error(`[ENCRYPTION] Failed to decrypt key for ${provider}:`, err.message);
                keys[provider] = null;
            }
        }
        
        return keys;
    } catch (err) {
        if (err.code === 'ENOENT') {
            return {}; // No keys stored yet
        }
        throw err;
    }
}

// Update a single API key
async function updateApiKey(provider, apiKey) {
    const keys = await loadApiKeys();
    keys[provider] = apiKey;
    await storeApiKeys(keys);
}

// Delete a single API key
async function deleteApiKey(provider) {
    const keys = await loadApiKeys();
    delete keys[provider];
    await storeApiKeys(keys);
}

// Get a single API key
async function getApiKey(provider) {
    const keys = await loadApiKeys();
    return keys[provider] || null;
}

// List stored providers (without keys)
async function listProviders() {
    try {
        const data = await fs.readFile(SECRETS_FILE, 'utf-8');
        const encryptedKeys = JSON.parse(data);
        return Object.keys(encryptedKeys);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return [];
        }
        throw err;
    }
}

module.exports = {
    encrypt,
    decrypt,
    storeApiKeys,
    loadApiKeys,
    updateApiKey,
    deleteApiKey,
    getApiKey,
    listProviders,
};
