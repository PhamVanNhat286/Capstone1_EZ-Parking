import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes";
import vnpayRouter from './payment/vnpay';
import bankRouter from './payment/bank';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Root route
app.get("/", (req, res) => {
  res.json({
    project: "EZ-Space Smart Parking API",
    version: "1.0.0",
    docs: "/api/health",
  });
});

// Main API routes
app.use("/api", routes);
app.use('/api/payment', vnpayRouter);
app.use('/api/payment', bankRouter);

export default app;
