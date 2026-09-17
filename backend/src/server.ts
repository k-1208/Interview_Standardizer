import dotenv from 'dotenv';
import http from 'http';

try {
    console.log('Importing app..');
    const appModule = await import('./app.js');
    const app = appModule.default;

    console.log('Importing morgan..');
    const morgan = await import('morgan');

    dotenv.config();
    app.use(morgan.default('dev'));

    // Initialize BullMQ email worker background process
    try {
        console.log('Initializing BullMQ email worker...');
        await import('./service/queue/email.worker.js');
        console.log('✅ Email worker initialized');
    } catch (workerErr) {
        console.warn('⚠️ Could not initialize background email worker (Redis may be offline):', workerErr);
    }

    const PORT = parseInt(process.env.PORT || '4000');
    const httpServer = http.createServer(app);

    httpServer.listen(PORT, async () => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
} catch (error) {
    console.error('Error during server startup:', error);
}