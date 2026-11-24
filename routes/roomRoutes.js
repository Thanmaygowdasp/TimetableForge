
const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM rooms ORDER BY id DESC");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.post("/", async (req, res) => {
    try {
        const {
            room_number,
            room_type,
            capacity,
            equipment_count
        } = req.body;

        const roomCapacity = Number(capacity);
        const equipmentCount = Number(equipment_count || 0);

        if (
            !room_number ||
            !["CLASSROOM", "LAB"].includes(room_type) ||
            !Number.isInteger(roomCapacity) ||
            roomCapacity <= 0 ||
            !Number.isInteger(equipmentCount) ||
            equipmentCount < 0
        ) {
            return res.status(400).json({
                message: "Enter valid room details."
            });
        }

        if (room_type === "CLASSROOM" && equipmentCount !== 0) {
            return res.status(400).json({
                message: "Classrooms cannot have lab equipment."
            });
        }

        const [result] = await db.query(
            `INSERT INTO rooms
            (room_number, room_type, capacity, equipment_count)
            VALUES (?, ?, ?, ?)`,
            [
                room_number,
                room_type,
                roomCapacity,
                equipmentCount
            ]
        );

        res.status(201).json({
            message: "Room added successfully.",
            id: result.insertId
        });

    } catch (error) {
        console.error("ROOM ADD ERROR:", error);

        res.status(500).json({
            error: error.message
        });
    }
});


router.delete("/:id", async (req, res) => {
    const connection = await db.getConnection();

    try {
        const roomId = req.params.id;

        await connection.beginTransaction();

        // Check whether room exists
        const [rooms] = await connection.query(
            "SELECT id FROM rooms WHERE id = ?",
            [roomId]
        );

        if (rooms.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                message: "Room not found"
            });
        }

        // Delete timetable entries using this room
        await connection.query(
            "DELETE FROM timetables WHERE room_id = ?",
            [roomId]
        );

        // Delete room
        await connection.query(
            "DELETE FROM rooms WHERE id = ?",
            [roomId]
        );

        await connection.commit();

        res.json({
            message: "Room and related timetable entries deleted successfully"
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
