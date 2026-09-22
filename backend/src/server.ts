import dotenv from 'dotenv';
import http from 'http';

try {
    console.log('Importing app..');
    const appModule = await import('./app.js');
    const app = appModule.default;
    const { startPdfWorker, stopPdfWorker } = await import('./service/queue/pdf.worker.js');
    const { startEmailWorker, stopEmailWorker } = await import('./service/queue/email.worker.js');
    const { serviceBusClient } = await import('./config/serviceBus.js');

    console.log('Importing morgan..');
    const morgan = await import('morgan');

    dotenv.config();
    app.use(morgan.default('dev'));

    const PORT = parseInt(process.env.PORT || '4000');
    const httpServer = http.createServer(app);

    const shutdown = async (signal: string) => {
        console.log(`Received ${signal}; shutting down API and workers...`);
        await Promise.all([
            stopPdfWorker(),
            stopEmailWorker(),
            new Promise<void>((resolve) => httpServer.close(() => resolve())),
        ]);
        await serviceBusClient.close();
        process.exit(0);
    };

    process.once('SIGINT', () => void shutdown('SIGINT'));
    process.once('SIGTERM', () => void shutdown('SIGTERM'));

    httpServer.listen(PORT, async () => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
        startPdfWorker();
        startEmailWorker();
    });
} catch (error) {
    console.error('Error during server startup:', error);
}
