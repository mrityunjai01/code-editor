import log from "loglevel";

// Log levels: TRACE, DEBUG, INFO, WARN, ERROR, SILENT
// In production builds, console logs will be stripped by Vite anyway
const LOG_LEVEL = 
  process.env.NODE_ENV === "production" 
    ? "SILENT"  // Completely silent in production
    : process.env.NODE_ENV === "test"
    ? "ERROR"   // Only errors in tests
    : "DEBUG";  // Full logging in development

// Configure the root logger
log.setLevel(LOG_LEVEL as log.LogLevelDesc);

// Create module-specific loggers
const createModuleLogger = (module: string) => {
  const moduleLogger = log.getLogger(module);
  moduleLogger.setLevel(LOG_LEVEL as log.LogLevelDesc);
  return moduleLogger;
};

// Module-specific loggers
export const appLogger = createModuleLogger("app");
export const websocketLogger = createModuleLogger("websocket");
export const cursorLogger = createModuleLogger("cursor");
export const editorLogger = createModuleLogger("editor");
export const queueLogger = createModuleLogger("queue");

// Enhanced logging functions with timestamps and module names
const createEnhancedLogger = (moduleLogger: log.Logger, moduleName: string) => {
  const timestamp = () => new Date().toISOString().substr(11, 8);

  return {
    debug: (message: string, ...args: any[]) =>
      moduleLogger.debug(
        `[${timestamp()}] [${moduleName}] ${message}`,
        ...args,
      ),

    info: (message: string, ...args: any[]) =>
      moduleLogger.info(`[${timestamp()}] [${moduleName}] ${message}`, ...args),

    warn: (message: string, ...args: any[]) =>
      moduleLogger.warn(`[${timestamp()}] [${moduleName}] ${message}`, ...args),

    error: (message: string, ...args: any[]) =>
      moduleLogger.error(
        `[${timestamp()}] [${moduleName}] ${message}`,
        ...args,
      ),
  };
};

// Export enhanced loggers
export const logger = {
  app: createEnhancedLogger(appLogger, "APP"),
  websocket: createEnhancedLogger(websocketLogger, "WS"),
  cursor: createEnhancedLogger(cursorLogger, "CURSOR"),
  editor: createEnhancedLogger(editorLogger, "EDITOR"),
  queue: createEnhancedLogger(queueLogger, "QUEUE"),
};

// Default logger (backwards compatibility)
export default createEnhancedLogger(log, "DEFAULT");

// Global logger configuration
export const setLogLevel = (level: log.LogLevelDesc) => {
  log.setLevel(level);
  appLogger.setLevel(level);
  websocketLogger.setLevel(level);
  cursorLogger.setLevel(level);
  editorLogger.setLevel(level);
  queueLogger.setLevel(level);
};
