const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const cors = require("cors");
const passport = require("passport");
require("dotenv").config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be configured in the backend environment.");
}

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be configured in the backend environment.");
}

const app = express();
const isDevelopment = process.env.NODE_ENV
  ? process.env.NODE_ENV === "development"
  : process.env.npm_lifecycle_event === "dev";

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
  }),
);
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

async function startServer() {
  let store;

  try {
    await pool.query("SELECT 1");
    store = new pgSession({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    });
    console.log("Using PostgreSQL session store.");
  } catch (err) {
    if (!isDevelopment) {
      throw err;
    }

    store = new session.MemoryStore();
    console.warn(
      "PostgreSQL is unavailable; using in-memory sessions for development only.",
      err.code || err.message,
    );
  }

  app.use(
    session({
      store,
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: process.env.SESSION_COOKIE_SAME_SITE || "lax",
        secure: process.env.NODE_ENV === "production",
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());
  require("./passport")(passport, pool);

  app.use("/auth", require("./routes/authRoutes")(pool));
  app.use("/teams", require("./routes/teamRoutes")(pool));
  app.use("/tasks", require("./routes/taskRoutes")(pool));

  app.get("/test-db", async (_req, res) => {
    try {
      const result = await pool.query("SELECT NOW()");
      res.json({ success: true, time: result.rows[0].now });
    } catch (err) {
      console.error("Database connection check failed:", err);
      res.status(500).json({ error: "Database connection failed" });
    }
  });

  app.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", database: "connected" });
    } catch (err) {
      console.error("Health check database error:", err);
      res.status(503).json({ status: "unavailable", database: "disconnected" });
    }
  });

  app.use((err, _req, res, _next) => {
    console.error("Request error:", err);
    res.status(err.status || 500).json({ error: "The server could not complete the request." });
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start backend:", err);
  pool.end().finally(() => {
    process.exitCode = 1;
  });
});
