
const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM sections ORDER BY id DESC");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const { name, semester, department, student_count } = req.body;

        if (!name || !semester || !department || !student_count) {
            return res.status(400).json({ message: "All fields required" });
        }

        const [result] = await db.query(
            "INSERT INTO sections (name, semester, department, student_count) VALUES (?, ?, ?, ?)",
            [name, semester, department, student_count]
        );

        res.status(201).json({ message: "Section added", id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete section and related records
router.delete("/:id", async (req, res) => {
    const sectionId = req.params.id;
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Check whether section exists
        const [section] = await connection.query(
            "SELECT id FROM sections WHERE id = ?",
            [sectionId]
        );

        if (section.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                message: "Section not found"
            });
        }

        // Delete timetable entries
        await connection.query(
            "DELETE FROM timetables WHERE section_id = ?",
            [sectionId]
        );

        // Delete section-subject assignments
        await connection.query(
            "DELETE FROM section_subjects WHERE section_id = ?",
            [sectionId]
        );

        // Delete linked student accounts
        await connection.query(
            "DELETE FROM users WHERE section_id = ? AND role = 'STUDENT'",
            [sectionId]
        );

        // Delete section
        await connection.query(
            "DELETE FROM sections WHERE id = ?",
            [sectionId]
        );

        await connection.commit();

        res.json({
            message: "Section and related records deleted successfully"
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
