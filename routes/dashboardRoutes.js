
const express = require("express");
const router = express.Router();
const db = require("../db");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

// ADMIN DASHBOARD
router.get(
    "/admin",
    authenticateToken,
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const [faculty] = await db.query(
                "SELECT COUNT(*) AS total FROM faculty"
            );

            const [subjects] = await db.query(
                "SELECT COUNT(*) AS total FROM subjects"
            );

            const [sections] = await db.query(
                "SELECT COUNT(*) AS total FROM sections"
            );

            const [rooms] = await db.query(
                "SELECT COUNT(*) AS total FROM rooms"
            );

            const [classes] = await db.query(
                "SELECT COUNT(*) AS total FROM timetables"
            );

            res.json({
                role: "ADMIN",
                name: req.user.name,
                statistics: {
                    faculty: faculty[0].total,
                    subjects: subjects[0].total,
                    sections: sections[0].total,
                    rooms: rooms[0].total,
                    scheduled_classes: classes[0].total
                }
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// TEACHER DASHBOARD
router.get(
    "/teacher",
    authenticateToken,
    authorizeRoles("TEACHER"),
    async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT
                    sub.name AS subject,
                    sec.name AS section,
                    r.room_number AS room,
                    ts.day,
                    ts.start_time,
                    ts.end_time
                FROM timetables t
                JOIN subjects sub ON t.subject_id = sub.id
                JOIN sections sec ON t.section_id = sec.id
                JOIN rooms r ON t.room_id = r.id
                JOIN time_slots ts ON t.time_slot_id = ts.id
                WHERE t.faculty_id = ?
                ORDER BY FIELD(
                    ts.day,
                    'Monday', 'Tuesday', 'Wednesday',
                    'Thursday', 'Friday', 'Saturday'
                ), ts.start_time
            `, [req.user.faculty_id]);

            res.json({
                role: "TEACHER",
                name: req.user.name,
                timetable: rows
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// STUDENT DASHBOARD
router.get(
    "/student",
    authenticateToken,
    authorizeRoles("STUDENT"),
    async (req, res) => {
        try {
            const [rows] = await db.query(`
                SELECT
                    sub.name AS subject,
                    f.name AS faculty,
                    r.room_number AS room,
                    ts.day,
                    ts.start_time,
                    ts.end_time
                FROM timetables t
                JOIN subjects sub ON t.subject_id = sub.id
                JOIN faculty f ON t.faculty_id = f.id
                JOIN rooms r ON t.room_id = r.id
                JOIN time_slots ts ON t.time_slot_id = ts.id
                WHERE t.section_id = ?
                ORDER BY FIELD(
                    ts.day,
                    'Monday', 'Tuesday', 'Wednesday',
                    'Thursday', 'Friday', 'Saturday'
                ), ts.start_time
            `, [req.user.section_id]);

            res.json({
                role: "STUDENT",
                name: req.user.name,
                timetable: rows
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

module.exports = router;
    