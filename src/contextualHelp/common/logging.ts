// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Arguments = any[];


//======================
// Our custom log levels


export enum LogLevel {
    // Larger numbers are higher priority.
    Error = 40,
    Warn = 30,
    Info = 20,
    Debug = 10,
    Trace = 5

}

// Emit a log message derived from the args to all enabled transports.
export function log(logLevel: LogLevel, ...args: Arguments) {
    // Switch this to use winston later
    switch (logLevel) {
        case LogLevel.Error:
            console.error(args);
            break;

        case LogLevel.Warn:
            console.warn(args);
            break;

        default:
            console.log(args);
            break;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logVerbose(...args: any[]) {
    log(LogLevel.Trace, ...args);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logError(...args: any[]) {
    log(LogLevel.Error, ...args);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logInfo(...args: any[]) {
    log(LogLevel.Info, ...args);
}
