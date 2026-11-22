
const express = require("express");
const router = express.Router();
const db = require("../db");

// Get all faculty
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM faculty ORDER BY id DESC");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add faculty
router.post("/", async (req, res) => {
    try {
        const { name, email, department } = req.body;

        if (!name || !email || !department) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const [result] = await db.query(
            "INSERT INTO faculty (name, email, department) VALUES (?, ?, ?)",
            [name, email, department]
        );

        res.status(201).json({
            message: "Faculty added successfully",
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update faculty
router.put("/:id", async (req, res) => {
    try {
        const { name, email, department } = req.body;

        const [result] = await db.query(
            "UPDATE faculty SET name=?, email=?, department=? WHERE id=?",
            [name, email, department, req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Faculty not found" });
        }

        res.json({ message: "Faculty updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete faculty
router.delete("/:id", async (req, res) => {
    try {
        const facultyId = req.params.id;

        // Check existing subject assignments
        const [assignments] = await db.query(
            "SELECT COUNT(*) AS total FROM faculty_subjects WHERE faculty_id = ?",
            [facultyId]
        );

        if (assignments[0].total > 0) {
            return res.status(409).json({
                message: "Cannot delete faculty. Remove their subject assignments first."
            });
        }

        // Delete faculty
        const [result] = await db.query(
            "DELETE FROM faculty WHERE id = ?",
            [facultyId]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                message: "Faculty not found"
            });
        }

        res.json({ message: "Faculty deleted successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
