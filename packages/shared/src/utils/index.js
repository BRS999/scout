"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.sanitizeString = sanitizeString;
exports.truncateText = truncateText;
exports.formatTimestamp = formatTimestamp;
exports.parseTimestamp = parseTimestamp;
exports.sleep = sleep;
exports.measureExecutionTime = measureExecutionTime;
exports.deepClone = deepClone;
exports.mergeObjects = mergeObjects;
exports.isValidUrl = isValidUrl;
exports.extractCodeBlocks = extractCodeBlocks;
exports.formatBytes = formatBytes;
exports.validateEmail = validateEmail;
exports.capitalizeFirst = capitalizeFirst;
exports.camelToSnake = camelToSnake;
exports.snakeToCamel = snakeToCamel;
exports.removeMarkdown = removeMarkdown;
const uuid_1 = require("uuid");
// Utility functions for Scout
function generateId() {
    return (0, uuid_1.v4)();
}
function sanitizeString(input) {
    return input.trim().replace(/[<>'"&]/g, '');
}
function truncateText(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return `${text.substring(0, maxLength - 3)}...`;
}
function formatTimestamp(date) {
    return date.toISOString();
}
function parseTimestamp(timestamp) {
    return new Date(timestamp);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function measureExecutionTime(fn) {
    const startTime = Date.now();
    return fn().then((result) => ({
        result,
        executionTime: Date.now() - startTime,
    }));
}
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object')
        return obj;
    if (obj instanceof Date)
        return new Date(obj.getTime());
    if (Array.isArray(obj))
        return obj.map((item) => deepClone(item));
    const clonedObj = {};
    for (const key in obj) {
        if (Object.hasOwn(obj, key)) {
            clonedObj[key] = deepClone(obj[key]);
        }
    }
    return clonedObj;
}
function mergeObjects(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (source[key] !== undefined) {
            if (typeof source[key] === 'object' &&
                source[key] !== null &&
                !Array.isArray(source[key]) &&
                typeof result[key] === 'object' &&
                result[key] !== null &&
                !Array.isArray(result[key])) {
                // Type assertion for recursive merge
                result[key] = mergeObjects(result[key], source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
    }
    return result;
}
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
}
function extractCodeBlocks(text) {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const blocks = [];
    let match;
    while (true) {
        match = codeBlockRegex.exec(text);
        if (match === null)
            break;
        blocks.push({
            language: match[1] || 'text',
            content: match[2].trim(),
            fullMatch: match[0],
        });
    }
    return blocks;
}
function formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0)
        return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
}
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
function camelToSnake(str) {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
function removeMarkdown(text) {
    let result = text;
    // Remove code blocks
    result = result.replace(/```[\s\S]*?```/g, '');
    // Remove inline code
    result = result.replace(/`[^`]*`/g, '');
    // Remove links
    result = result.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    // Remove bold/italic
    result = result.replace(/(\*\*|__)(.*?)\1/g, '$2');
    result = result.replace(/(\*|_)(.*?)\1/g, '$2');
    // Remove headers
    result = result.replace(/^#+\s*/gm, '');
    return result.trim();
}
