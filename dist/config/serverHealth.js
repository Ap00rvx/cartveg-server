"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dayjs_1 = __importDefault(require("dayjs"));
const os_1 = __importDefault(require("os"));
const getHealthReport = () => {
    return {
        timestamp: (0, dayjs_1.default)().format("YYYY-MM-DD HH:mm:ss"),
        uptime: process.uptime(), // Server uptime in seconds
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        loadAverage: os_1.default.loadavg(), // CPU load average (1, 5, 15 minutes)
        freeMemory: os_1.default.freemem(),
        totalMemory: os_1.default.totalmem(),
        platform: os_1.default.platform(),
        cpuCores: os_1.default.cpus().length,
        nodeVersion: process.version,
        status: "healthy",
    };
};
exports.default = getHealthReport;
