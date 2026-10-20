const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const passport = require("passport");

module.exports = function (pool) {
  const User = require("../models/User")(pool);

  // Registration Route
  router.post("/register", async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return res.status(400).json({
        error: "Enter a valid email and a password with at least 8 characters.",
      });
    }

    try {
      // 1. Check if user already exists using the User model
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email is already registered" });
      }

      // 2. Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 3. Insert new user via User model
      const newUser = await User.create(email, hashedPassword);

      // 4. Respond with success
      res.status(201).json({
        message: "User registered successfully",
        user: newUser,
      });
    } catch (err) {
      console.error("Registration error:", err);
      if (err.code === "23505") {
        return res.status(409).json({ error: "Email is already registered" });
      }
      if (
        ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "EHOSTUNREACH"].includes(
          err.code,
        )
      ) {
        return res.status(503).json({
          error: "Registration is unavailable because the database cannot be reached. Check DATABASE_URL and try again.",
        });
      }
      if (err.code === "42P01") {
        return res.status(503).json({
          error: "The database tables are not set up. Run BackEnd/schema.sql and try again.",
        });
      }
      res.status(500).json({ error: "Server error during registration" });
    }
  });

  // Login Route
  router.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Incorrect email or password." });
      }

      return req.logIn(user, (loginError) => {
        if (loginError) {
          return next(loginError);
        }
        return res.json({
          message: "Logged in successfully",
          user: { id: user.id, email: user.email },
        });
      });
    })(req, res, next);
  });

  router.get("/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json({ authenticated: false, user: null });
    }
    return res.json({
      authenticated: true,
      user: { id: req.user.id, email: req.user.email },
    });
  });

  router.post("/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      return req.session.destroy((sessionError) => {
        if (sessionError) {
          return next(sessionError);
        }
        res.clearCookie("connect.sid");
        return res.json({ message: "Logged out successfully" });
      });
    });
  });

  return router;
};
