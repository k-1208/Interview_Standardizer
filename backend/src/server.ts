import dotenv from 'dotenv';
import http from 'http';

try{
    console.log('Importing app..');
    const appModule = await import('./app.js');
    const app = appModule.default;

    console.log('Importing morgan..');
    const morgan = await import('morgan');

    dotenv.config();
    app.use(morgan.default('dev'));

    const PORT = parseInt(process.env.PORT || '4000');

    const httpServer = http.createServer(app);
    
    httpServer.listen(PORT, async () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        try{
            console.log('For cron jobs if any, importing scheduler..');
        }catch(error){
            console.log('failed in something related to scheduler', error);
        }
    });
}catch(error){
    console.error('Error during server startup:', error);
    
}