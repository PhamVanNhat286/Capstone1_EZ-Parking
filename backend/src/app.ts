import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes";

dotenv.config();

const app = express();

app.use(cors({
  origin: true, // Allow frontend from localhost, 127.0.0.1, or network IP
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

// Main API routes (support both /api/* and root /*)
app.use("/api", routes);
app.use(routes);

export default app;
