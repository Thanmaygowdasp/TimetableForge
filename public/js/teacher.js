
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user || user.role !== "TEACHER") {
    window.location.href = "login.html";
}

const content = document.getElementById("teacherContent");

document.getElementById("teacherName").textContent = user.name;

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
});

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function loadTeacherTimetable() {
    content.innerHTML = "<p>Loading your teaching schedule...</p>";

    try {
        const response = await fetch("/api/dashboard/teacher", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load timetable.");
        }

        const timetable = data.timetable || [];

        if (timetable.length === 0) {
            content.innerHTML = `
                <div class="page-heading">
                    <h2>Welcome, ${escapeHTML(user.name)}!</h2>
                    <p>Your faculty workspace is ready.</p>
                </div>

                <div class="panel">
                    <h3>No Classes Assigned</h3>
                    <p style="color:#858ba3;font-size:13px">
                        Your teaching schedule will appear here once the administrator
                        generates and assigns your timetable.
                    </p>
                </div>
            `;
            return;
        }

        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

        timetable.sort((a, b) => {
            const dayA = days.indexOf(a.day);
            const dayB = days.indexOf(b.day);

            if (dayA !== dayB) {
                return (dayA === -1 ? 99 : dayA) - (dayB === -1 ? 99 : dayB);
            }

            return String(a.start_time).localeCompare(String(b.start_time));
        });

        const totalClasses = timetable.length;
        const totalSubjects = new Set(timetable.map(item => item.subject)).size;
        const totalSections = new Set(timetable.map(item => item.section)).size;

        content.innerHTML = `
            <div class="page-heading">
                <h2>Welcome back, ${escapeHTML(user.name)}!</h2>
                <p>Here is your weekly teaching overview.</p>
            </div>

            <div class="stats">
                <div class="stat-card">
                    <p>Total Classes</p>
                    <h2>${totalClasses}</h2>
                </div>

                <div class="stat-card">
                    <p>Subjects Assigned</p>
                    <h2>${totalSubjects}</h2>
                </div>

                <div class="stat-card">
                    <p>Sections</p>
                    <h2>${totalSections}</h2>
                </div>

                <div class="stat-card">
                    <p>Weekly Schedule</p>
                    <h2>Active</h2>
                </div>
            </div>

            <div class="panel">
                <div class="page-toolbar">
                    <div>
                        <h3>My Teaching Schedule</h3>
                        <p style="color:#858ba3;font-size:12px">
                            Your assigned classes for the week
                        </p>
                    </div>
                </div>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Day</th>
                                <th>Time</th>
                                <th>Subject</th>
                                <th>Section</th>
                                <th>Room</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${timetable.map(item => `
                                <tr>
                                    <td><strong>${escapeHTML(item.day)}</strong></td>
                                    <td>${escapeHTML(item.start_time)} - ${escapeHTML(item.end_time)}</td>
                                    <td>${escapeHTML(item.subject)}</td>
                                    <td>${escapeHTML(item.section)}</td>
                                    <td>${escapeHTML(item.room)}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

    } catch (error) {
        content.innerHTML = `
            <div class="panel">
                <h3>Unable to Load Schedule</h3>
                <p style="color:#e65b68;font-size:13px">
                    ${escapeHTML(error.message)}
                </p>
                <button class="btn" onclick="loadTeacherTimetable()">
                    Try Again
                </button>
            </div>
        `;
    }
}

loadTeacherTimetable();
