
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");

const router = express.Router();

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");


// ==========================================
// PUBLIC: GET REGISTRATION OPTIONS
// ==========================================

router.get("/registration-options", async (req, res) => {
    try {
        const [sections] = await db.query(
            "SELECT id, name, semester, department FROM sections ORDER BY semester, name"
        );

        res.json({ sections });

    } catch (error) {
        console.error("REGISTRATION OPTIONS ERROR:", error);
        res.status(500).json({
            message: "Unable to load registration options."
        });
    }
});


// ==========================================
// PUBLIC: STUDENT / TEACHER REGISTRATION
// ==========================================

router.post("/register", async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            department,
            section_id
        } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: "Name, email, password and role are required."
            });
        }

        if (!["TEACHER", "STUDENT"].includes(role)) {
            return res.status(400).json({
                message: "Only students and teachers can register."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        let teacherDepartment = null;
        let studentSection = null;

        if (role === "TEACHER") {
            const allowedDepartments = [
                "CSE", "ISE", "ECE", "EEE", "ME", "CIVIL"
            ];

            if (!department || !allowedDepartments.includes(department)) {
                return res.status(400).json({
                    message: "Please select a valid department."
                });
            }

            if (section_id) {
                return res.status(400).json({
                    message: "Teachers cannot select a student section."
                });
            }

            teacherDepartment = department;
        }

        if (role === "STUDENT") {
            if (!section_id || department) {
                return res.status(400).json({
                    message: "Please select a valid student section."
                });
            }

            const [sections] = await db.query(
                "SELECT id FROM sections WHERE id = ?",
                [section_id]
            );

            if (sections.length === 0) {
                return res.status(404).json({
                    message: "Section not found."
                });
            }

            studentSection = section_id;
        }

        const [existingUsers] = await db.query(
            "SELECT id FROM users WHERE email = ?",
            [cleanEmail]
        );

        const [existingRequests] = await db.query(
            `SELECT id FROM registration_requests
             WHERE email = ? AND status = 'PENDING'`,
            [cleanEmail]
        );

        if (existingUsers.length > 0 || existingRequests.length > 0) {
            return res.status(409).json({
                message: "An account or pending request already exists for this email."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await db.query(
            `INSERT INTO registration_requests
            (name, email, password_hash, role, department, faculty_id, section_id)
            VALUES (?, ?, ?, ?, ?, NULL, ?)`,
            [
                name.trim(),
                cleanEmail,
                passwordHash,
                role,
                teacherDepartment,
                studentSection
            ]
        );

        res.status(201).json({
            message: "Registration submitted successfully. Please wait for admin approval."
        });

    } catch (error) {
        console.error("REGISTRATION ERROR:", error);

        res.status(500).json({
            message: "Unable to submit registration request."
        });
    }
});


// ==========================================
// ADMIN: VIEW REGISTRATION REQUESTS
// ==========================================

router.get(
    "/registration-requests",
    authenticateToken,
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const [requests] = await db.query(
                `SELECT
                    r.id,
                    r.name,
                    r.email,
                    r.role,
                    r.department,
                    r.section_id,
                    r.status,
                    r.requested_at,
                    s.name AS section_name,
                    s.semester
                 FROM registration_requests r
                 LEFT JOIN sections s ON r.section_id = s.id
                 WHERE r.status = 'PENDING'
                 ORDER BY r.requested_at DESC`
            );

            res.json(requests);

        } catch (error) {
            console.error("REQUEST FETCH ERROR:", error);
            res.status(500).json({
                message: "Unable to fetch registration requests."
            });
        }
    }
);


// ==========================================
// ADMIN: APPROVE REGISTRATION
// ==========================================


router.post(
    "/approve-registration/:id",
    authenticateToken,
    authorizeRoles("ADMIN"),
    async (req, res) => {
        let connection;

        try {
            connection = await db.getConnection();
            await connection.beginTransaction();

            const [requests] = await connection.query(
                `SELECT * FROM registration_requests
                 WHERE id = ? AND status = 'PENDING'
                 FOR UPDATE`,
                [req.params.id]
            );

            if (requests.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    message: "Pending registration request not found."
                });
            }

            const request = requests[0];

            const [existing] = await connection.query(
                "SELECT id FROM users WHERE email = ?",
                [request.email]
            );

            if (existing.length > 0) {
                await connection.query(
                    `UPDATE registration_requests
                     SET status = 'REJECTED',
                         reviewed_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [request.id]
                );

                await connection.commit();

                return res.status(409).json({
                    message: "This email already has an account. Request marked as rejected."
                });
            }

            let facultyId = null;

            // Create faculty record only for teachers
            if (request.role === "TEACHER") {

                if (!request.department) {
                    throw new Error(
                        "Teacher registration is missing a department."
                    );
                }

                const [facultyResult] = await connection.query(
                    `INSERT INTO faculty (name, email, department)
                     VALUES (?, ?, ?)`,
                    [
                        request.name,
                        request.email,
                        request.department
                    ]
                );

                facultyId = facultyResult.insertId;
            }

            // Create user account
            await connection.query(
                `INSERT INTO users
                (name, email, password_hash, role, faculty_id, section_id, department)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    request.name,
                    request.email,
                    request.password_hash,
                    request.role,
                    facultyId,
                    request.section_id,
                    request.department
                ]
            );

            await connection.query(
                `UPDATE registration_requests
                 SET status = 'APPROVED',
                     reviewed_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [request.id]
            );

            await connection.commit();

            res.json({
                message: `${request.role} registration approved successfully.`
            });

        } catch (error) {
            if (connection) {
                await connection.rollback();
            }

            console.error("APPROVAL ERROR:", error);

            res.status(500).json({
                message: "Unable to approve registration.",
                error: error.message
            });

        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
);


// ==========================================
// ADMIN: REJECT REGISTRATION
// ==========================================

router.post(
    "/reject-registration/:id",
    authenticateToken,
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const [result] = await db.query(
                `UPDATE registration_requests
                 SET status = 'REJECTED',
                     reviewed_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND status = 'PENDING'`,
                [req.params.id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Pending registration request not found."
                });
            }

            res.json({
                message: "Registration request rejected successfully."
            });

        } catch (error) {
            console.error("REJECTION ERROR:", error);

            res.status(500).json({
                message: "Unable to reject registration."
            });
        }
    }
);


// ==========================================
// EXISTING ADMIN: CREATE TEACHER / STUDENT
// ==========================================

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

            if (role === "TEACHER" && !faculty_id) {
                return res.status(400).json({
                    message: "Faculty ID is required for teachers."
                });
            }

            if (role === "STUDENT" && !section_id) {
                return res.status(400).json({
                    message: "Section ID is required for students."
                });
            }

            if (role === "TEACHER") {
                const [faculty] = await db.query(
                    "SELECT id FROM faculty WHERE id = ?",
                    [faculty_id]
                );

                if (!faculty.length) {
                    return res.status(404).json({
                        message: "Faculty not found."
                    });
                }
            }

            if (role === "STUDENT") {
                const [section] = await db.query(
                    "SELECT id FROM sections WHERE id = ?",
                    [section_id]
                );

                if (!section.length) {
                    return res.status(404).json({
                        message: "Section not found."
                    });
                }
            }

            const cleanEmail = email.trim().toLowerCase();

            const [existing] = await db.query(
                "SELECT id FROM users WHERE email = ?",
                [cleanEmail]
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
                    name.trim(),
                    cleanEmail,
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


// ==========================================
// EXISTING ADMIN: CREATE ANOTHER ADMIN
// ==========================================

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

            const cleanEmail = email.trim().toLowerCase();

            const [existing] = await db.query(
                "SELECT id FROM users WHERE email = ?",
                [cleanEmail]
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
                [name.trim(), cleanEmail, passwordHash]
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

router.get(
    "/students",
    authenticateToken,
    authorizeRoles("ADMIN"),
    async (req, res) => {
        try {
            const [students] = await db.query(
                `SELECT
                    u.id,
                    u.name,
                    u.email,
                    s.name AS section_name
                 FROM users u
                 LEFT JOIN sections s ON u.section_id = s.id
                 WHERE u.role = 'STUDENT'
                 ORDER BY u.name`
            );

            res.json(students);
        } catch (error) {
            console.error("STUDENT FETCH ERROR:", error);

            res.status(500).json({
                message: "Unable to fetch students."
            });
        }
    }
);


module.exports = router;
