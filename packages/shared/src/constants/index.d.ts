export declare const DEFAULT_CONFIG: {
    LLM: {
        PROVIDER: "ollama";
        MODEL: string;
        TEMPERATURE: number;
        MAX_TOKENS: number;
        TIMEOUT: number;
    };
    AGENTS: {
        DEFAULT: "casual";
        ENABLED: string[];
        MAX_MEMORY: number;
    };
    TOOLS: {
        TIMEOUT: number;
        MAX_RETRIES: number;
        RETRY_DELAY: number;
    };
    SYSTEM: {
        PORT: number;
        LOG_LEVEL: "info";
        ENABLE_METRICS: boolean;
        MAX_CONCURRENT_REQUESTS: number;
    };
};
export declare const SUPPORTED_LANGUAGES: string[];
export declare const MIME_TYPES: {
    JSON: string;
    TEXT: string;
    HTML: string;
    XML: string;
    CSV: string;
    PDF: string;
    ZIP: string;
    IMAGE_JPEG: string;
    IMAGE_PNG: string;
    IMAGE_GIF: string;
    IMAGE_WEBP: string;
};
export declare const HTTP_STATUS: {
    OK: number;
    CREATED: number;
    BAD_REQUEST: number;
    UNAUTHORIZED: number;
    FORBIDDEN: number;
    NOT_FOUND: number;
    INTERNAL_SERVER_ERROR: number;
    BAD_GATEWAY: number;
    SERVICE_UNAVAILABLE: number;
    GATEWAY_TIMEOUT: number;
};
export declare const ERROR_CODES: {
    VALIDATION_ERROR: string;
    EXECUTION_ERROR: string;
    TIMEOUT_ERROR: string;
    NETWORK_ERROR: string;
    AUTHENTICATION_ERROR: string;
    PERMISSION_ERROR: string;
    RESOURCE_NOT_FOUND: string;
    QUOTA_EXCEEDED: string;
    CONFIGURATION_ERROR: string;
};
export declare const AGENT_PROMPTS: {
    SYSTEM_PREFIX: string;
    CODING_SUFFIX: string;
    ANALYSIS_SUFFIX: string;
};
export declare const RATE_LIMITS: {
    REQUESTS_PER_MINUTE: number;
    REQUESTS_PER_HOUR: number;
    CONCURRENT_REQUESTS: number;
    BURST_LIMIT: number;
};
export declare const CACHE_CONFIG: {
    TTL: number;
    MAX_SIZE: number;
    COMPRESSION: boolean;
    SERIALIZATION: string;
};
export declare const METRICS_CONFIG: {
    ENABLE_PROMETHEUS: boolean;
    METRICS_PORT: number;
    COLLECT_DEFAULT_METRICS: boolean;
    REQUEST_DURATION_BUCKETS: number[];
    REQUEST_SIZE_BUCKETS: number[];
};
