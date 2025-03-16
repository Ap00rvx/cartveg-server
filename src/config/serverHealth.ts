import dayjs from 'dayjs';
import os from 'os';
const getHealthReport = () => {
    return {
      timestamp: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      uptime: process.uptime(), // Server uptime in seconds
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      loadAverage: os.loadavg(), // CPU load average (1, 5, 15 minutes)
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      platform: os.platform(),
      cpuCores: os.cpus().length,
      nodeVersion: process.version,
      status: "healthy",
    };
  };


export default getHealthReport;