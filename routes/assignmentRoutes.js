
const express = require("express");
const router = express.Router();
const db = require("../db");

// Assign subject to faculty
router.post("/faculty-subject", async (req, res) => {
    try {
        const { faculty_id, subject_id } = req.body;

        if (!faculty_id || !subject_id) {
            return res.status(400).json({
                message: "Faculty and subject are required"
            });
        }

        const [result] = await db.query(
            `INSERT INTO faculty_subjects (faculty_id, subject_id)
             VALUES (?, ?)`,
            [faculty_id, subject_id]
        );

        res.status(201).json({
            message: "Faculty assigned to subject",
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Assign subject and faculty to section
router.post("/section-subject", async (req, res) => {
    try {
        const { section_id, subject_id, faculty_id } = req.body;

        if (!section_id || !subject_id || !faculty_id) {
            return res.status(400).json({
                message: "All assignments are required"
            });
        }

        const [facultyAssignment] = await db.query(
            `SELECT id FROM faculty_subjects
             WHERE faculty_id = ? AND subject_id = ?`,
            [faculty_id, subject_id]
        );

        if (!facultyAssignment.length) {
            return res.status(400).json({
                message: "Assign this subject to the faculty first"
            });
        }

        const [result] = await db.query(
            `INSERT INTO section_subjects
             (section_id, subject_id, faculty_id)
             VALUES (?, ?, ?)`,
            [section_id, subject_id, faculty_id]
        );

        res.status(201).json({
            message: "Subject assigned to section successfully",
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// View all section assignments
router.get("/section-subject", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT ss.id, sec.name AS section,
                   sub.name AS subject, f.name AS faculty
            FROM section_subjects ss
            JOIN sections sec ON ss.section_id = sec.id
            JOIN subjects sub ON ss.subject_id = sub.id
            JOIN faculty f ON ss.faculty_id = f.id
            ORDER BY sec.name
        `);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
