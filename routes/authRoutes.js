
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();


// ==========================================
// ADMIN REGISTRATION WITH SECRET KEY
// ==========================================

router.post("/register-admin", async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            secretKey
        } = req.body;

        if (!name || !email || !password || !secretKey) {
            return res.status(400).json({
                message: "All fields are required."
            });
        }

        if (!process.env.ADMIN_REGISTRATION_KEY) {
            return res.status(500).json({
                message: "Admin registration is not configured."
            });
        }

        if (secretKey !== process.env.ADMIN_REGISTRATION_KEY) {
            return res.status(403).json({
                message: "Invalid administrator registration key."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const [existingUsers] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [cleanEmail]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                message: "Email already exists."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await db.query(
            `INSERT INTO users
            (name, email, password_hash, role)
            VALUES (?, ?, ?, 'ADMIN')`,
            [name.trim(), cleanEmail, passwordHash]
        );

        res.status(201).json({
            message: "Administrator account created successfully."
        });

    } catch (error) {
        console.error("ADMIN REGISTRATION ERROR:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Email already exists."
            });
        }

        res.status(500).json({
            message: "Admin registration failed."
        });
    }
});


// ==========================================
// LOGIN API
// ==========================================

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const [users] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [cleanEmail]
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
