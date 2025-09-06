"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutError = exports.ExecutionError = exports.ValidationError = exports.AgenticSeekError = exports.ProviderType = exports.ToolType = exports.BlockType = exports.AgentType = void 0;
// Enums
var AgentType;
(function (AgentType) {
    AgentType["CASUAL"] = "casual";
    AgentType["CODER"] = "coder";
    AgentType["BROWSER"] = "browser";
    AgentType["PLANNER"] = "planner";
    AgentType["DATA_ANALYST"] = "data_analyst";
    AgentType["RESEARCHER"] = "researcher";
})(AgentType || (exports.AgentType = AgentType = {}));
var BlockType;
(function (BlockType) {
    BlockType["CODE"] = "code";
    BlockType["TEXT"] = "text";
    BlockType["OUTPUT"] = "output";
    BlockType["ERROR"] = "error";
    BlockType["WEB_CONTENT"] = "web_content";
})(BlockType || (exports.BlockType = BlockType = {}));
var ToolType;
(function (ToolType) {
    ToolType["CODE_EXECUTOR"] = "code_executor";
    ToolType["FILE_SYSTEM"] = "file_system";
    ToolType["WEB_SCRAPER"] = "web_scraper";
    ToolType["API_CLIENT"] = "api_client";
    ToolType["DATABASE"] = "database";
    ToolType["IMAGE_PROCESSOR"] = "image_processor";
})(ToolType || (exports.ToolType = ToolType = {}));
var ProviderType;
(function (ProviderType) {
    ProviderType["OPENAI"] = "openai";
    ProviderType["ANTHROPIC"] = "anthropic";
    ProviderType["GOOGLE"] = "google";
    ProviderType["OLLAMA"] = "ollama";
    ProviderType["LM_STUDIO"] = "lm_studio";
    ProviderType["CUSTOM"] = "custom";
})(ProviderType || (exports.ProviderType = ProviderType = {}));
// Error types
class AgenticSeekError extends Error {
    code;
    statusCode;
    constructor(message, code, statusCode = 500) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AgenticSeekError';
    }
}
exports.AgenticSeekError = AgenticSeekError;
class ValidationError extends AgenticSeekError {
    constructor(message) {
        super(message, 'VALIDATION_ERROR', 400);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class ExecutionError extends AgenticSeekError {
    constructor(message) {
        super(message, 'EXECUTION_ERROR', 500);
        this.name = 'ExecutionError';
    }
}
exports.ExecutionError = ExecutionError;
class TimeoutError extends AgenticSeekError {
    constructor(message) {
        super(message, 'TIMEOUT_ERROR', 408);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
