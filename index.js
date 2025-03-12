import express from "express";
import dotenv from "dotenv";
import winston from "winston";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 3 * 60 * 1000, // 3 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many attempts, please try again in 3 minutes",
  statusCode: 429,
});
app.use(limiter);

// Verify and create the logs directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDirectory = path.join(__dirname, "logs");
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Configuration of winston for log management
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

const PORT = process.env.SERVER_PORT || 3000; // Use the port defined in .env or 3000 by default

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// Middleware to log requests
app.use((req, res, next) => {
  logger.info(`Request received: ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// Routes
app.get("/", (req, res) => {
  logger.info(`Access to the main page from ${req.ip}`);
  res.send("Welcome to the server");
});

// Route to generate an error
app.get("/error", (req, res) => {
  logger.error(`Simulated error - Request from ${req.ip}`);
  res.send("An error occurred on the server");
});

// Route to simulate a login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const maskedPassword = password.replace(/./g, "*");
  logger.error(
    `Failed login attempt: email=${email}, password=${maskedPassword}`
  );
  res.status(401).send("Invalid credentials");
});

// Middleware to handle errors
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).send("Internal server error");
});
