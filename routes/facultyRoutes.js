
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
    const facultyId = req.params.id;
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Check whether faculty exists
        const [faculty] = await connection.query(
            "SELECT id FROM faculty WHERE id = ?",
            [facultyId]
        );

        if (faculty.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                message: "Faculty not found"
            });
        }

        // Delete related timetable entries
        await connection.query(
            "DELETE FROM timetables WHERE faculty_id = ?",
            [facultyId]
        );

        // Delete section-subject assignments
        await connection.query(
            "DELETE FROM section_subjects WHERE faculty_id = ?",
            [facultyId]
        );

        // Delete faculty-subject assignments
        await connection.query(
            "DELETE FROM faculty_subjects WHERE faculty_id = ?",
            [facultyId]
        );
        // Delete linked teacher login account
        await connection.query(
            "DELETE FROM users WHERE faculty_id = ? AND role = 'TEACHER'",
            [facultyId]
        );

        // Delete faculty
        await connection.query(
            "DELETE FROM faculty WHERE id = ?",
            [facultyId]
        );

        await connection.commit();

        res.json({
            message: "Faculty and related assignments deleted successfully"
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        res.status(500).json({
            error: error.message
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});
module.exports = router;
