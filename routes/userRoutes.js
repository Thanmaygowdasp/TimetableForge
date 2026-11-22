
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");

const router = express.Router();

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

// Admin creates teacher/student accounts
router.post(
    "/create",
    authenticateToken,
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const {
                name,
                email,
                password,
                role,
                faculty_id,
                section_id
            } = req.body;

            if (!name || !email || !password || !role) {
                return res.status(400).json({
                    message: "Name, email, password and role are required."
                });
            }

            if (!["TEACHER", "STUDENT"].includes(role)) {
                return res.status(400).json({
                    message: "Only TEACHER and STUDENT accounts can be created."
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    message: "Password must contain at least 8 characters."
                });
            }

            if (role === "TEACHER") {
                if (!faculty_id) {
                    return res.status(400).json({
                        message: "Faculty ID is required for teachers."
                    });
                }

                const [faculty] = await db.query(
                    "SELECT id FROM faculty WHERE id = ?",
                    [faculty_id]
                );

                if (faculty.length === 0) {
                    return res.status(404).json({
                        message: "Faculty not found."
                    });
                }
            }

            if (role === "STUDENT") {
                if (!section_id) {
                    return res.status(400).json({
                        message: "Section ID is required for students."
                    });
                }

                const [section] = await db.query(
                    "SELECT id FROM sections WHERE id = ?",
                    [section_id]
                );

                if (section.length === 0) {
                    return res.status(404).json({
                        message: "Section not found."
                    });
                }
            }

            const [existing] = await db.query(
                "SELECT id FROM users WHERE email = ?",
                [email]
            );

            if (existing.length > 0) {
                return res.status(409).json({
                    message: "Email already exists."
                });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            await db.query(
                `INSERT INTO users
                (name, email, password_hash, role, faculty_id, section_id)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    name,
                    email,
                    passwordHash,
                    role,
                    role === "TEACHER" ? faculty_id : null,
                    role === "STUDENT" ? section_id : null
                ]
            );

            res.status(201).json({
                message: `${role} account created successfully.`
            });

        } catch (error) {
            console.error("USER CREATION ERROR:", error);

            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    message: "Email or faculty account already exists."
                });
            }

            res.status(500).json({
                message: "Unable to create account."
            });
        }
    }
);
// Admin creates another Admin account
router.post(
    "/create-admin",
    authenticateToken,
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const { name, email, password } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({
                    message: "Name, email and password are required."
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    message: "Password must contain at least 8 characters."
                });
            }

            const [existing] = await db.query(
                "SELECT id FROM users WHERE email = ?",
                [email]
            );

            if (existing.length > 0) {
                return res.status(409).json({
                    message: "Email already exists."
                });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            await db.query(
                `INSERT INTO users
                (name, email, password_hash, role, faculty_id, section_id)
                VALUES (?, ?, ?, 'ADMIN', NULL, NULL)`,
                [name, email, passwordHash]
            );

            res.status(201).json({
                message: "ADMIN account created successfully."
            });

        } catch (error) {
            console.error("ADMIN CREATION ERROR:", error);

            res.status(500).json({
                message: "Unable to create Admin account."
            });
        }
    }
);

module.exports = router;
