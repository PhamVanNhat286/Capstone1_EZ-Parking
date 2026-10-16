import app from "./app";
import { testDbConnection } from "./config/db";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  console.log("[Backend] Starting EZ-Space Server...");
  
  // Test connection to PostgreSQL
  const dbOk = await testDbConnection();
  if (!dbOk) {
    console.warn("[Backend] Warning: Could not connect to Database. Please check your .env settings.");
  }

  app.listen(PORT, () => {
    console.log(`[Backend] EZ-Space API is running at: http://localhost:${PORT}`);
    console.log(`[Backend] Health check: http://localhost:${PORT}/api/health`);
    console.log(`[Backend] Parking Lots API: http://localhost:${PORT}/api/lots`);
  });
};

startServer();
