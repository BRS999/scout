export declare function generateId(): string;
export declare function sanitizeString(input: string): string;
export declare function truncateText(text: string, maxLength: number): string;
export declare function formatTimestamp(date: Date): string;
export declare function parseTimestamp(timestamp: string): Date;
export declare function sleep(ms: number): Promise<void>;
export declare function measureExecutionTime<T>(fn: () => Promise<T>): Promise<{
    result: T;
    executionTime: number;
}>;
export declare function deepClone<T>(obj: T): T;
export declare function mergeObjects<T extends Record<string, unknown>>(target: T, source: Partial<T>): T;
export declare function isValidUrl(url: string): boolean;
export declare function extractCodeBlocks(text: string): Array<{
    language: string;
    content: string;
    fullMatch: string;
}>;
export declare function formatBytes(bytes: number): string;
export declare function validateEmail(email: string): boolean;
export declare function capitalizeFirst(str: string): string;
export declare function camelToSnake(str: string): string;
export declare function snakeToCamel(str: string): string;
export declare function removeMarkdown(text: string): string;
