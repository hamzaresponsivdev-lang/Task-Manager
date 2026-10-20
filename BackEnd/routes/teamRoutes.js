const express = require("express");
const router = express.Router();
const ensureAuthenticated = require("../middleware/authMiddleware");

module.exports = function (pool) {
  const Team = require("../models/Team")(pool);

  // Create Team Route
  router.post("/", ensureAuthenticated, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return res.status(400).json({ error: "Team name is required." });
    }
    const userId = req.user.id;

    try {
      const newTeam = await Team.create(name, userId);
      res.status(201).json({
        message: "Team created successfully",
        team: newTeam,
      });
    } catch (err) {
      console.error("Team creation error:", err);
      res.status(500).json({ error: "Server error during team creation" });
    }
  });

  // Get All Teams Route
  router.get("/", ensureAuthenticated, async (req, res) => {
    try {
      const teams = await Team.findAll(req.user.id);
      res.json({ teams });
    } catch (err) {
      console.error("Fetch teams error:", err);
      res.status(500).json({ error: "Server error fetching teams" });
    }
  });

  return router;
};
