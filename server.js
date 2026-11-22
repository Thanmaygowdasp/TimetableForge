
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

const {
    authenticateToken,
    authorizeRoles
} = require("./middleware/authMiddleware");
const facultyRoutes = require("./routes/facultyRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const roomRoutes = require("./routes/roomRoutes");
const sectionRoutes = require("./routes/sectionRoutes");
const timetableRoutes = require("./routes/timetableRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const userRoutes = require("./routes/userRoutes");


const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ADMIN ONLY APIs
app.use("/api/assignments", authenticateToken, authorizeRoles("ADMIN"), assignmentRoutes);
app.use("/api/faculty", authenticateToken, authorizeRoles("ADMIN"), facultyRoutes);
app.use("/api/subjects", authenticateToken, authorizeRoles("ADMIN"), subjectRoutes);
app.use("/api/rooms", authenticateToken, authorizeRoles("ADMIN"), roomRoutes);
app.use("/api/sections", authenticateToken, authorizeRoles("ADMIN"), sectionRoutes);
app.use("/api/timetable", authenticateToken, authorizeRoles("ADMIN"), timetableRoutes);

// AUTHENTICATION
app.use("/api/auth", authRoutes);

// DASHBOARDS
app.use("/api/dashboard", dashboardRoutes);

// USER MANAGEMENT
app.use("/api/users", userRoutes);


app.get("/api/test", async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT DATABASE() AS database_name"
        );

        res.json({
            status: "success",
            message: "TimetableForge connected to MySQL!",
            database: rows[0].database_name
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("TimetableForge running on port 3000");
});

