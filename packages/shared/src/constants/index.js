"use strict";
// Constants for Scout
Object.defineProperty(exports, "__esModule", { value: true });
exports.METRICS_CONFIG = exports.CACHE_CONFIG = exports.RATE_LIMITS = exports.AGENT_PROMPTS = exports.ERROR_CODES = exports.HTTP_STATUS = exports.MIME_TYPES = exports.SUPPORTED_LANGUAGES = exports.DEFAULT_CONFIG = void 0;
exports.DEFAULT_CONFIG = {
    LLM: {
        PROVIDER: 'ollama',
        MODEL: 'deepseek-r1:14b',
        TEMPERATURE: 0.7,
        MAX_TOKENS: 4096,
        TIMEOUT: 30000,
    },
    AGENTS: {
        DEFAULT: 'casual',
        ENABLED: ['casual', 'coder', 'browser', 'planner'],
        MAX_MEMORY: 100,
    },
    TOOLS: {
        TIMEOUT: 30000,
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
    },
    SYSTEM: {
        PORT: 7777,
        LOG_LEVEL: 'info',
        ENABLE_METRICS: true,
        MAX_CONCURRENT_REQUESTS: 10,
    },
};
exports.SUPPORTED_LANGUAGES = [
    'javascript',
    'typescript',
    'python',
    'java',
    'cpp',
    'c',
    'go',
    'rust',
    'php',
    'ruby',
    'swift',
    'kotlin',
    'r',
    'scala',
    'dart',
];
exports.MIME_TYPES = {
    JSON: 'application/json',
    TEXT: 'text/plain',
    HTML: 'text/html',
    XML: 'application/xml',
    CSV: 'text/csv',
    PDF: 'application/pdf',
    ZIP: 'application/zip',
    IMAGE_JPEG: 'image/jpeg',
    IMAGE_PNG: 'image/png',
    IMAGE_GIF: 'image/gif',
    IMAGE_WEBP: 'image/webp',
};
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
};
exports.ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    EXECUTION_ERROR: 'EXECUTION_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    PERMISSION_ERROR: 'PERMISSION_ERROR',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
};
exports.AGENT_PROMPTS = {
    SYSTEM_PREFIX: `You are an AI assistant with access to various tools and capabilities.
You can execute code, browse the web, analyze data, and perform various tasks.
Always be helpful, accurate, and provide clear explanations for your actions.`,
    CODING_SUFFIX: `
When writing code:
- Use proper error handling
- Include comments for complex logic
- Follow language-specific best practices
- Test edge cases when possible
- Use meaningful variable names`,
    ANALYSIS_SUFFIX: `
When analyzing data:
- Always explore the data first
- Check for missing values and outliers
- Use appropriate statistical methods
- Create clear visualizations
- Provide actionable insights`,
};
exports.RATE_LIMITS = {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 1000,
    CONCURRENT_REQUESTS: 10,
    BURST_LIMIT: 20,
};
exports.CACHE_CONFIG = {
    TTL: 3600000, // 1 hour in milliseconds
    MAX_SIZE: 1000,
    COMPRESSION: true,
    SERIALIZATION: 'json',
};
exports.METRICS_CONFIG = {
    ENABLE_PROMETHEUS: true,
    METRICS_PORT: 9090,
    COLLECT_DEFAULT_METRICS: true,
    REQUEST_DURATION_BUCKETS: [0.1, 0.5, 1, 2, 5, 10],
    REQUEST_SIZE_BUCKETS: [100, 1000, 10000, 100000, 1000000],
};
