const express = require("express");
const router = express.Router();
const ensureAuthenticated = require("../middleware/authMiddleware");

module.exports = function (pool) {
  const Task = require("../models/Task")(pool);

  // Create Task Route
  router.post("/", ensureAuthenticated, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const teamId = body.team_id;
    if (!title || !teamId) {
      return res.status(400).json({ error: "Task title and team are required." });
    }

    try {
      const newTask = await Task.create(title, description, teamId, req.user.id);
      if (!newTask) {
        return res.status(404).json({ error: "Team not found." });
      }
      res.status(201).json({
        message: "Task created successfully",
        task: newTask,
      });
    } catch (err) {
      console.error("Task creation error:", err);
      res.status(500).json({ error: "Server error during task creation" });
    }
  });

  // Get Tasks by Team Route
  router.get("/team/:teamId", ensureAuthenticated, async (req, res) => {
    const { teamId } = req.params;

    try {
      const tasks = await Task.findByTeam(teamId, req.user.id);
      res.json({ tasks });
    } catch (err) {
      console.error("Fetch tasks error:", err);
      res.status(500).json({ error: "Server error fetching tasks" });
    }
  });

  // Update Task Status Route
  router.patch("/:id/status", ensureAuthenticated, async (req, res) => {
    const { id } = req.params;
    const status = req.body?.status;
    if (!["To Do", "In Progress", "Done"].includes(status)) {
      return res.status(400).json({ error: "Choose a valid task status." });
    }

    try {
      const updatedTask = await Task.updateStatus(id, status, req.user.id);
      if (!updatedTask) {
        return res.status(404).json({ error: "Task not found." });
      }
      res.json({
        message: "Task status updated successfully",
        task: updatedTask,
      });
    } catch (err) {
      console.error("Update task error:", err);
      res.status(500).json({ error: "Server error updating task status" });
    }
  });

  router.delete("/:id", ensureAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
      const deletedTask = await Task.delete(id, req.user.id);
      if (!deletedTask) {
        return res.status(404).json({ error: "Task not found." });
      }
      return res.json({ message: "Task deleted successfully." });
    } catch (err) {
      console.error("Delete task error:", err);
      return res.status(500).json({ error: "Server error deleting task." });
    }
  });

  return router;
};
