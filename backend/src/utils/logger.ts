import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const logFormat = winston.format.printf(({ level, message, timestamp, stack, metadata, ...rest }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (stack) {
        msg += `\n${stack}`;
    }

    const metaObj = metadata || rest;
    if (metaObj && Object.keys(metaObj).length > 0) {
        const metaStr = JSON.stringify(metaObj);
        if (metaStr !== "{}") {
            msg += ` ${metaStr}`;
        }
    }
    return msg;
});

const commonFormats = [
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ["message", "level", "timestamp", "stack"] }),
];

const fileFormat = winston.format.combine(...commonFormats, logFormat);

const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        ...commonFormats,
        logFormat
    ),
});

// API logger — writes to api log file only (no console)
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "debug",
    transports: [
        new DailyRotateFile({
            filename: path.join("logs", "%DATE%-api.log"),
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            format: fileFormat,
        }),
    ],
});

// Scheduler logger — writes to scheduler log file AND console
export const schedulerLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || "debug",
    transports: [
        consoleTransport,
        new DailyRotateFile({
            filename: path.join("logs", "%DATE%-scheduler.log"),
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            format: fileFormat,
        }),
    ],
});

export const stream = {
    write: (message: string) => {
        logger.info(message.trim());
    },
};
