
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

// Create first admin account (only when users table is empty)
router.post("", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const [existingUsers] = await db.query(
            "SELECT id FROM users LIMIT 1"
        );

        if (existingUsers.length > 0) {
            return res.status(403).json({
                message: "Admin setup is already completed."
            });
        }

        if (!name || !email || !password || password.length < 8) {
            return res.status(400).json({
                message: "Provide name, email and a password of at least 8 characters."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await db.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES (?, ?, ?, 'ADMIN')`,
            [name, email, passwordHash]
        );

        res.status(201).json({
            message: "First admin account created successfully."
        });

    } catch (error) {
        console.error("ADMIN SETUP ERROR:", error);
        res.status(500).json({
            message: "Admin setup failed."
        });
    }
});


// Login API
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const [users] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const user = users[0];

        const validPassword = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!validPassword) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                faculty_id: user.faculty_id,
                section_id: user.section_id
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).json({
            message: "Login failed."
        });
    }
});

module.exports = router;
