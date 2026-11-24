
const express = require("express");
const router = express.Router();

const db = require("../db");
const generateTimetable = require("../algorithm/timetableGenerator");

// GET: View timetable
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                t.id,
                s.name AS section,
                sub.name AS subject,
                f.name AS faculty,
                r.room_number AS room,
                r.room_type,
                ts.day,
                ts.start_time,
                ts.end_time
            FROM timetables t
            JOIN sections s ON t.section_id = s.id
            JOIN subjects sub ON t.subject_id = sub.id
            JOIN faculty f ON t.faculty_id = f.id
            JOIN rooms r ON t.room_id = r.id
            JOIN time_slots ts ON t.time_slot_id = ts.id
            ORDER BY FIELD(
                ts.day,
                'Monday', 'Tuesday', 'Wednesday',
                'Thursday', 'Friday', 'Saturday'
            ), ts.start_time, s.name
        `);

        res.json(rows);

    } catch (error) {
        console.error("GET TIMETABLE ERROR:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Generate timetable
router.post("/generate", async (req, res) => {
    let connection;

    try {
        const [tasks] = await db.query(`
            SELECT
                ss.section_id,
                ss.subject_id,
                ss.faculty_id,
                sub.weekly_hours,
                sub.requires_lab,
                sec.student_count
            FROM section_subjects ss
            JOIN subjects sub ON ss.subject_id = sub.id
            JOIN sections sec ON ss.section_id = sec.id
        `);

        const [slots] = await db.query(
            "SELECT * FROM time_slots ORDER BY day, start_time"
        );

        const [rooms] = await db.query(
            "SELECT * FROM rooms ORDER BY capacity"
        );

        if (!tasks.length || !slots.length || !rooms.length) {
            return res.status(400).json({
                message: "Add subjects, assignments, rooms and time slots first."
            });
        }
        console.log("ROOMS:", rooms);
        console.log("TASKS:", tasks);
        // Generate schedule
        const result = generateTimetable(tasks, slots, rooms);

        if (!result.success) {
            return res.status(400).json({
                message: result.message
            });
        }

        // Save schedule
        connection = await db.getConnection();

        await connection.beginTransaction();

        await connection.query("DELETE FROM timetables");

        for (const item of result.assignments) {
            await connection.query(
                `INSERT INTO timetables
                (section_id, subject_id, faculty_id, room_id, time_slot_id)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    item.section_id,
                    item.subject_id,
                    item.faculty_id,
                    item.room_id,
                    item.time_slot_id
                ]
            );
        }

        await connection.commit();

        res.json({
            message: result.message,
            total_classes: result.assignments.length
        });

    } catch (error) {
        console.error("TIMETABLE GENERATION ERROR:", error);

        if (connection) {
            await connection.rollback();
        }

        res.status(500).json({
            error: error.message || String(error)
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// DELETE: Clear timetable
router.delete("/clear", async (req, res) => {
    try {
        await db.query("DELETE FROM timetables");

        res.json({
            message: "Timetable cleared successfully"
        });

    } catch (error) {
        console.error("CLEAR TIMETABLE ERROR:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
