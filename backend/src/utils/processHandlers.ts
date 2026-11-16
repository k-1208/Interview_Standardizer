/**
 * Process-level safety net. Logs async errors nobody caught instead of letting them
 * vanish, and exits on uncaught exceptions (the process state is no longer trustworthy;
 * Docker's restart policy brings it back).
 */
export const installProcessHandlers = (name: string) => {
  process.on('unhandledRejection', (reason) => {
    console.error(`[${name}] Unhandled promise rejection:`, reason);
  });

  process.on('uncaughtException', (error) => {
    console.error(`[${name}] Uncaught exception — exiting:`, error);
    process.exit(1);
  });
};
