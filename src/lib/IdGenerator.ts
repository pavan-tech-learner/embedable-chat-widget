/// <reference types="../../vite-env.d.ts" />
// getDeviceId.js

export async function getDeviceId() {
    const storageKey = 'livechat_device_id';

    // Check localStorage first
    let existing = localStorage.getItem(storageKey);
    if (existing) return existing;

    // Generate secure UUID
    const uuid = generateSecureUUID();

    // Generate browser fingerprint hash
    const fingerprintHash = await generateFingerprintHash();

    // Combine both
    const deviceId = `${uuid}-${fingerprintHash.slice(0, 12)}`; // You can use full hash if desired

    // Store in indexDB
    localStorage.setItem(storageKey , deviceId);
    
    return deviceId;
}

// --- Helper: Secure UUID v4 ---
function generateSecureUUID() {
    if (crypto.randomUUID) {
        return crypto.randomUUID(); // Native
    }

    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);

    buf[6] = (buf[6] & 0x0f) | 0x40; // Version 4
    buf[8] = (buf[8] & 0x3f) | 0x80; // Variant

    const hex = [...buf].map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 4)}-${hex.slice(12, 4)}-${hex.slice(16, 4)}-${hex.slice(20)}`;
}

// --- Helper: Browser Fingerprint SHA-256 ---
async function generateFingerprintHash() {
    const fingerprintData = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        screen.colorDepth,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        new Date().getTimezoneOffset(),
        navigator.platform,
        navigator.hardwareConcurrency,
        navigator.deviceMemory || 'unknown',
    ].join('|');

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(fingerprintData);

    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}