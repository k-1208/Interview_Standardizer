import dotenv from 'dotenv';
import http from 'http';
import { installProcessHandlers } from './utils/processHandlers.js';

dotenv.config();
installProcessHandlers('api');

try {
    console.log('Importing app..');
    const appModule = await import('./app.js');
    const app = appModule.default;
    const { startPdfWorker, stopPdfWorker } = await import('./service/queue/pdf.worker.js');
    const { startEmailWorker, stopEmailWorker } = await import('./service/queue/email.worker.js');
    const { pdfQueue } = await import('./service/queue/pdf.queue.js');
    const { emailQueue } = await import('./service/queue/email.queue.js');

    console.log('Importing morgan..');
    const morgan = await import('morgan');

    app.use(morgan.default('dev'));

    const PORT = parseInt(process.env.PORT || '4000');
    // Set RUN_WORKERS=false when workers run in a dedicated container (npm run worker).
    const runWorkers = process.env.RUN_WORKERS !== 'false';
    const httpServer = http.createServer(app);

    const shutdown = async (signal: string) => {
        console.log(`Received ${signal}; shutting down API and workers...`);
        await Promise.all([
            stopPdfWorker(),
            stopEmailWorker(),
            new Promise<void>((resolve) => httpServer.close(() => resolve())),
        ]);
        await Promise.all([pdfQueue.close(), emailQueue.close()]);
        process.exit(0);
    };

    process.once('SIGINT', () => void shutdown('SIGINT'));
    process.once('SIGTERM', () => void shutdown('SIGTERM'));

    httpServer.listen(PORT, async () => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
        if (runWorkers) {
            startPdfWorker();
            startEmailWorker();
        }
    });
} catch (error) {
    console.error('Error during server startup:', error);
    process.exit(1);
}
