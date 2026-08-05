import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const logFormat = winston.format.printf(({ level, message, timestamp, stack, metadata, ...rest }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (stack) {
        msg += `\n${stack}`;
    }

    // Collect metadata from both the root metadata property (if using format.metadata) or the rest of the object
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

export const logger = winston.createLogger({
    level: "info",
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                ...commonFormats,
                logFormat
            ),
        }),
        new DailyRotateFile({
            filename: path.join("logs", "application-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            format: winston.format.combine(
                ...commonFormats,
                logFormat
            ),
        }),
    ],
});

// Create a stream object for other libraries if needed
export const stream = {
    write: (message: string) => {
        logger.info(message.trim());
    },
};
