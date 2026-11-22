
const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM subjects ORDER BY id DESC");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const { name, code, weekly_hours, requires_lab } = req.body;

        if (!name || !code || !weekly_hours) {
            return res.status(400).json({ message: "Required fields missing" });
        }

        const [result] = await db.query(
            "INSERT INTO subjects (name, code, weekly_hours, requires_lab) VALUES (?, ?, ?, ?)",
            [name, code, weekly_hours, !!requires_lab]
        );

        res.status(201).json({ message: "Subject added", id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete("/:id", async (req, res) => {
    const connection = await db.getConnection();

    try {
        const subjectId = req.params.id;

        await connection.beginTransaction();

        // Check whether subject exists
        const [subjects] = await connection.query(
            "SELECT id FROM subjects WHERE id = ?",
            [subjectId]
        );

        if (subjects.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                message: "Subject not found"
            });
        }
        // Delete timetable entries
        await connection.query(
            "DELETE FROM timetables WHERE subject_id = ?",
            [subjectId]
        );

        // Delete faculty assignments
        await connection.query(
            "DELETE FROM faculty_subjects WHERE subject_id = ?",
            [subjectId]
        );

        // Delete section assignments
        await connection.query(
            "DELETE FROM section_subjects WHERE subject_id = ?",
            [subjectId]
        );

        // Delete subject
        await connection.query(
            "DELETE FROM subjects WHERE id = ?",
            [subjectId]
        );

        await connection.commit();

        res.json({
            message: "Subject and related assignments deleted successfully"
        });

    } catch (error) {
        await connection.rollback();

        res.status(500).json({
            error: error.message
        });

    } finally {
        connection.release();
    }
});

module.exports = router;
