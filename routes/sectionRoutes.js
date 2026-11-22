
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

router.delete("/:id", async (req, res) => {
    try {
        const [result] = await db.query(
            "DELETE FROM sections WHERE id = ?", [req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Section not found" });
        }

        res.json({ message: "Section deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
