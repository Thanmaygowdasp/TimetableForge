
const bcrypt = require("bcryptjs");
const db = require("./db");

async function resetPassword() {
    const newPassword = "Admin@12345";

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
        "UPDATE users SET password_hash = ? WHERE email = ? AND role = 'ADMIN'",
        [hashedPassword, "admin@timetableforge.com"]
    );

    console.log("Admin password updated successfully!");

    await db.end();
}

resetPassword().catch(error => {
    console.error(error);
    process.exit(1);
});
