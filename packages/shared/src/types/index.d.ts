export interface Agent {
    id: string;
    name: string;
    type: AgentType;
    role: string;
    capabilities: string[];
    isActive: boolean;
}
export interface Query {
    id: string;
    content: string;
    timestamp: Date;
    userId?: string;
    metadata?: Record<string, unknown>;
}
export interface QueryResult {
    answer: string;
    reasoning: string;
    agentName: string;
    success: boolean;
    blocks: CodeBlock[];
    status: string;
    executionTime: number;
    metadata?: Record<string, unknown>;
}
export interface CodeBlock {
    id: string;
    type: BlockType;
    content: string;
    language?: string;
    output?: string;
    error?: string;
    success: boolean;
    executionTime?: number;
}
export interface Tool {
    id: string;
    name: string;
    description: string;
    type: ToolType;
    execute: (input: unknown) => Promise<ToolResult>;
    validate?: (input: unknown) => boolean;
}
export interface ToolResult {
    success: boolean;
    output: unknown;
    error?: string;
    executionTime: number;
    metadata?: Record<string, unknown>;
}
export interface LLMProvider {
    id: string;
    name: string;
    type: ProviderType;
    models: string[];
    isAvailable: boolean;
    chat: (messages: LLMMessage[], options?: LLMOptions) => Promise<LLMResponse>;
    generate?: (prompt: string, options?: LLMOptions) => Promise<LLMResponse>;
    checkAvailability?: () => Promise<boolean>;
}
export interface LLMResponse {
    content: string;
    reasoning?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason?: string;
    metadata?: Record<string, unknown>;
}
export interface LLMOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
    stream?: boolean;
}
export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface MemoryEntry {
    id: string;
    type: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}
export interface Conversation {
    id: string;
    messages: MemoryEntry[];
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, unknown>;
}
export declare enum AgentType {
    CASUAL = "casual",
    CODER = "coder",
    BROWSER = "browser",
    PLANNER = "planner",
    DATA_ANALYST = "data_analyst",
    RESEARCHER = "researcher"
}
export declare enum BlockType {
    CODE = "code",
    TEXT = "text",
    OUTPUT = "output",
    ERROR = "error",
    WEB_CONTENT = "web_content"
}
export declare enum ToolType {
    CODE_EXECUTOR = "code_executor",
    FILE_SYSTEM = "file_system",
    WEB_SCRAPER = "web_scraper",
    API_CLIENT = "api_client",
    DATABASE = "database",
    IMAGE_PROCESSOR = "image_processor"
}
export declare enum ProviderType {
    OPENAI = "openai",
    ANTHROPIC = "anthropic",
    GOOGLE = "google",
    OLLAMA = "ollama",
    LM_STUDIO = "lm_studio",
    CUSTOM = "custom"
}
export interface ScoutConfig {
    llm: {
        provider: ProviderType;
        model: string;
        apiKey?: string;
        baseUrl?: string;
        options?: LLMOptions;
    };
    agents: {
        enabled: AgentType[];
        default: AgentType;
    };
    tools: {
        enabled: ToolType[];
        timeout: number;
    };
    system: {
        maxMemory: number;
        logLevel: 'debug' | 'info' | 'warn' | 'error';
        enableMetrics: boolean;
    };
}
export interface APIRequest {
    query: string;
    agentType?: AgentType;
    options?: {
        stream?: boolean;
        timeout?: number;
        metadata?: Record<string, unknown>;
    };
}
export interface APIResponse {
    id: string;
    result: QueryResult;
    timestamp: Date;
    processingTime: number;
}
export declare class ScoutError extends Error {
    code: string;
    statusCode: number;
    constructor(message: string, code: string, statusCode?: number);
}
export declare class ValidationError extends ScoutError {
    constructor(message: string);
}
export declare class ExecutionError extends ScoutError {
    constructor(message: string);
}
export declare class TimeoutError extends ScoutError {
    constructor(message: string);
}
export interface ResearchQuery {
    question: string;
    description?: string;
    tags?: string[];
    require_recent?: boolean;
    depth?: 'shallow' | 'medium' | 'deep';
    sources?: string[];
}
export interface ResearchResult {
    query: string;
    answer: string;
    sources: string[];
    confidence: number;
    session_id: string;
    memory_used: boolean;
    new_sources_found: number;
    chunks_stored: number;
    metadata?: {
        search_time_ms?: number;
        synthesis_time_ms?: number;
        total_chunks_analyzed?: number;
    };
}
export interface AgentConfig {
    id?: string;
    name?: string;
    llm?: {
        provider?: string;
        model?: string;
        temperature?: number;
    };
    tools?: string[];
    memory?: boolean;
}
export interface AgentState {
    status: 'idle' | 'running' | 'completed' | 'error';
    current_task?: string;
    progress?: number;
    metadata?: Record<string, any>;
}
