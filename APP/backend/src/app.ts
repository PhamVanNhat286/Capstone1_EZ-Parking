import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

export default app;
