const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user || user.role !== "ADMIN") {
    window.location.href = "login.html";
}
const API = "/api";

const content = document.getElementById("content");
const pageTitle = document.getElementById("page-title");

let currentPage = "dashboard";

async function request(url, options = {}) {
    const response = await fetch(API + url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...options.headers
        }
    });

    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "login.html";
        throw new Error("Session expired or access denied.");
    }

    if (!response.ok) {
        throw new Error(data.message || data.error || "Request failed");
    }

    return data;
}

function showMessage(message) {
    alert(message);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formPage(title, description, fields, endpoint, reloadPage) {
    content.innerHTML = `
        <div class="page-heading">
            <h2>${title}</h2>
            <p>${description}</p>
        </div>
        <div class="panel">
            <form id="data-form">
                <div class="form-grid">
                    ${fields.map(field => `
                        <div>
                            <label>${field.label}</label>
                            ${field.options ? `
                                <select name="${field.name}" ${field.required === false ? "" : "required"}>
                                    ${field.options.map(option =>
        `<option value="${option.value}">${option.label}</option>`
    ).join("")}
                                </select>
                            ` : `
                                <input
                                    name="${field.name}"
                                    type="${field.type || "text"}"
                                    ${field.required === false ? "" : "required"}
                                    ${field.min !== undefined ? `min="${field.min}"` : ""}
                                    ${field.step !== undefined ? `step="${field.step}"` : ""}
                                >
                            `}
                        </div>
                    `).join("")}
                </div>
                <button class="btn" type="submit">Add ${title.replace(" Management", "").replace(" Management", "")}</button>
            </form>
        </div>
        <div class="panel">
            <div class="table-wrap">
                <table>
                    <thead id="table-head"></thead>
                    <tbody id="table-body"></tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById("data-form").onsubmit = async e => {
        e.preventDefault();

        const body = Object.fromEntries(new FormData(e.target).entries());

        for (const field of fields) {
            if (field.type === "number") {
                body[field.name] = Number(body[field.name]);
            }
        }

        if (body.requires_lab !== undefined) {
            body.requires_lab = body.requires_lab === "true";
        }

        try {
            await request(endpoint, {
                method: "POST",
                body: JSON.stringify(body)
            });

            showMessage("Added successfully!");
            e.target.reset();
            await reloadPage();
            await loadDashboardStats();
        } catch (error) {
            showMessage(error.message);
        }
    };
}

async function renderTable(endpoint, columns, deleteEndpoint) {
    const rows = await request(endpoint);

    document.getElementById("table-head").innerHTML = `
        <tr>
            ${columns.map(c => `<th>${c.label}</th>`).join("")}
            <th>Action</th>
        </tr>
    `;

    document.getElementById("table-body").innerHTML = rows.map(row => `
        <tr>
            ${columns.map(c => `<td>${escapeHTML(row[c.key])}</td>`).join("")}
            <td>
                <button class="btn btn-danger" data-delete="${row.id}">Delete</button>
            </td>
        </tr>
    `).join("") || `<tr><td colspan="${columns.length + 1}">No records found</td></tr>`;

    document.querySelectorAll("[data-delete]").forEach(button => {
        button.onclick = async () => {
            if (!confirm("Are you sure you want to delete this record?")) return;

            try {
                await request(`${deleteEndpoint}/${button.dataset.delete}`, {
                    method: "DELETE"
                });

                showMessage("Deleted successfully!");
                await loadPage(currentPage);
                await loadDashboardStats();
            } catch (error) {
                showMessage(error.message);
            }
        };
    });
}


async function loadDashboardStats() {
    const data = await request("/dashboard/admin");
    const stats = data.statistics;

    content.innerHTML = `
        <div class="page-heading">
            <h2>Welcome back, ${escapeHTML(data.name)}!</h2>
            <p>Here's what's happening across your university today.</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <p>Total Faculty</p>
                <h2>${stats.faculty}</h2>
                <small style="color:#858ba3">Teaching staff</small>
            </div>

            <div class="stat-card">
                <p>Total Subjects</p>
                <h2>${stats.subjects}</h2>
                <small style="color:#858ba3">Academic courses</small>
            </div>

            <div class="stat-card">
                <p>Total Sections</p>
                <h2>${stats.sections}</h2>
                <small style="color:#858ba3">Student groups</small>
            </div>

            <div class="stat-card">
                <p>Available Rooms</p>
                <h2>${stats.rooms}</h2>
                <small style="color:#858ba3">Classrooms and labs</small>
            </div>

            <div class="stat-card">
                <p>Scheduled Classes</p>
                <h2>${stats.scheduled_classes}</h2>
                <small style="color:#858ba3">Generated sessions</small>
            </div>
        </div>

        <div class="panel" style="
            background:linear-gradient(120deg,#242747,#39346c);
            color:white;
            padding:30px;
            border:none;
        ">
            <div style="max-width:600px">
                <p style="
                    color:#bcb8ff;
                    font-size:11px;
                    font-weight:700;
                    letter-spacing:1.5px;
                    margin-bottom:12px;
                ">
                    AUTOMATED SCHEDULING ENGINE
                </p>

                <h2 style="font-size:23px;margin-bottom:10px">
                    Create a conflict-free timetable
                </h2>

                <p style="
                    color:#c3c5d8;
                    font-size:13px;
                    line-height:1.8;
                    margin-bottom:22px;
                ">
                    Automatically allocate faculty, classrooms and time slots
                    while preventing scheduling conflicts.
                </p>

                <button class="btn" id="generate-dashboard" style="
                    background:white;
                    color:#554bc9;
                ">
                    Generate Timetable →
                </button>
            </div>
        </div>

        <div class="panel">
            <h3>System Overview</h3>
            <p style="color:#858ba3;font-size:13px;line-height:1.8">
                TimetableForge is managing your university's faculty,
                subjects, sections, room allocations and weekly academic schedules
                from one centralized workspace.
            </p>
        </div>
    `;

    document.getElementById("generate-dashboard").onclick = generateTimetable;
}



async function loadFaculty() {
    const data = await request("/faculty");

    content.innerHTML = `
        <div class="page-heading">
            <h2>Faculty Management</h2>
            <p>Manage university teaching staff and faculty information.</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <p>Total Faculty</p>
                <h2>${data.length}</h2>
                <small style="color:#858ba3">Registered teaching staff</small>
            </div>
            <div class="stat-card">
                <p>Departments</p>
                <h2>${new Set(data.map(f => f.department)).size}</h2>
                <small style="color:#858ba3">Academic departments</small>
            </div>
        </div>

        <div class="panel">
            <h3>Add New Faculty</h3>
            <p style="color:#858ba3;font-size:13px;margin-bottom:20px">
                Enter the faculty member's details below.
            </p>

            <form id="faculty-form" class="form-grid">
                <div class="form-group">
                    <label>Faculty Name</label>
                    <input name="name" placeholder="Enter faculty name" required>
                </div>

                <div class="form-group">
                    <label>Email Address</label>
                    <input name="email" type="email" placeholder="Enter email address" required>
                </div>

                <div class="form-group">
                    <label>Department</label>
                    <input name="department" placeholder="Enter department" required>
                </div>

                <button class="btn" type="submit">+ Add Faculty</button>
            </form>
        </div>

        <div class="panel">
            <div class="page-toolbar">
                <div>
                    <h3>Faculty Directory</h3>
                    <p style="color:#858ba3;font-size:12px">
                        All registered teaching staff
                    </p>
                </div>
                <input id="faculty-search" placeholder="Search faculty..." style="max-width:230px">
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Faculty</th>
                            <th>Email Address</th>
                            <th>Department</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="faculty-table">
                        ${data.map(f => `
                            <tr>
                                <td><strong>${escapeHTML(f.name)}</strong></td>
                                <td>${escapeHTML(f.email)}</td>
                                <td>${escapeHTML(f.department)}</td>
                                <td>
                                    <button class="btn btn-danger" data-delete="${f.id}">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById("faculty-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = Object.fromEntries(new FormData(e.target));

        try {
            await request("/faculty", {
                method: "POST",
                body: JSON.stringify(formData)
            });

            await loadFaculty();
            loadDashboardStats();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById("faculty-table").addEventListener("click", async (e) => {
        const button = e.target.closest("[data-delete]");
        if (!button) return;

        if (!confirm("Are you sure you want to delete this faculty member?")) return;

        try {
            await request(`/faculty/${button.dataset.delete}`, {
                method: "DELETE"
            });

            await loadFaculty();
            loadDashboardStats();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById("faculty-search").addEventListener("input", (e) => {
        const search = e.target.value.toLowerCase();

        document.querySelectorAll("#faculty-table tr").forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(search)
                ? ""
                : "none";
        });
    });
}



async function loadSubjects() {
    const data = await request("/subjects");

    const labCount = data.filter(s =>
        s.requires_lab === true ||
        s.requires_lab === 1 ||
        s.requires_lab === "1"
    ).length;

    content.innerHTML = `
        <div class="page-heading">
            <h2>Subject Management</h2>
            <p>Manage academic courses, subject codes and weekly lecture hours.</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <p>Total Subjects</p>
                <h2>${data.length}</h2>
                <small style="color:#858ba3">Registered courses</small>
            </div>
            <div class="stat-card">
                <p>Lab Subjects</p>
                <h2>${labCount}</h2>
                <small style="color:#858ba3">Require laboratory sessions</small>
            </div>
            <div class="stat-card">
                <p>Theory Subjects</p>
                <h2>${data.length - labCount}</h2>
                <small style="color:#858ba3">Non-laboratory courses</small>
            </div>
        </div>

        <div class="panel">
            <h3>Add New Subject</h3>
            <p style="color:#858ba3;font-size:13px;margin-bottom:20px">
                Enter the academic subject details.
            </p>

            <form id="subject-form" class="form-grid">
                <div class="form-group">
                    <label>Subject Name</label>
                    <input name="name" placeholder="e.g. Data Structures" required>
                </div>

                <div class="form-group">
                    <label>Subject Code</label>
                    <input name="code" placeholder="e.g. CS301" required>
                </div>

                <div class="form-group">
                    <label>Weekly Hours</label>
                    <input name="weekly_hours" type="number" min="1"
                        placeholder="Enter weekly hours" required>
                </div>

                <div class="form-group">
                    <label>Requires Laboratory?</label>
                    <select name="requires_lab">
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                    </select>
                </div>

                <button class="btn" type="submit">+ Add Subject</button>
            </form>
        </div>

        <div class="panel">
            <div class="page-toolbar">
                <div>
                    <h3>Subject Directory</h3>
                    <p style="color:#858ba3;font-size:12px">
                        All registered academic courses
                    </p>
                </div>
                <input id="subject-search" placeholder="Search subjects..."
                    style="max-width:230px">
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th>Subject Code</th>
                            <th>Weekly Hours</th>
                            <th>Category</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="subject-table">
                        ${data.map(s => {
        const isLab = s.requires_lab === true ||
            s.requires_lab === 1 ||
            s.requires_lab === "1";

        return `
                                <tr>
                                    <td><strong>${escapeHTML(s.name)}</strong></td>
                                    <td>${escapeHTML(s.code)}</td>
                                    <td>${escapeHTML(s.weekly_hours)} hrs</td>
                                    <td>
                                        <span class="badge">
                                            ${isLab ? "Laboratory" : "Theory"}
                                        </span>
                                    </td>
                                    <td>
                                        <button class="btn btn-danger"
                                            data-delete="${s.id}">
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            `;
    }).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById("subject-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = Object.fromEntries(new FormData(e.target));

        formData.weekly_hours = Number(formData.weekly_hours);
        formData.requires_lab = formData.requires_lab === "true";

        try {
            await request("/subjects", {
                method: "POST",
                body: JSON.stringify(formData)
            });

            await loadSubjects();
            loadDashboardStats();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById("subject-table").addEventListener("click", async (e) => {
        const button = e.target.closest("[data-delete]");
        if (!button) return;

        if (!confirm("Are you sure you want to delete this subject?")) return;

        try {
            await request(`/subjects/${button.dataset.delete}`, {
                method: "DELETE"
            });

            await loadSubjects();
            loadDashboardStats();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById("subject-search").addEventListener("input", (e) => {
        const search = e.target.value.toLowerCase();

        document.querySelectorAll("#subject-table tr").forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(search)
                ? ""
                : "none";
        });
    });
}



async function loadSections() {
    const data = await request("/sections");

    const totalStudents = data.reduce(
        (sum, section) => sum + Number(section.student_count || 0), 0
    );

    const departments = new Set(data.map(s => s.department)).size;

    content.innerHTML = `
        <div class="page-heading">
            <h2>Section Management</h2>
            <p>Organize university classes, departments and student groups.</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <p>Total Sections</p>
                <h2>${data.length}</h2>
                <small style="color:#858ba3">Registered student groups</small>
            </div>
            <div class="stat-card">
                <p>Total Students</p>
                <h2>${totalStudents}</h2>
                <small style="color:#858ba3">Across all sections</small>
            </div>
            <div class="stat-card">
                <p>Departments</p>
                <h2>${departments}</h2>
                <small style="color:#858ba3">Academic departments</small>
            </div>
        </div>

        <div class="panel">
            <h3>Add New Section</h3>
            <p style="color:#858ba3;font-size:13px;margin-bottom:20px">
                Enter the details of the student group.
            </p>

            <form id="section-form" class="form-grid">
                <div class="form-group">
                    <label>Section Name</label>
                    <input name="name" placeholder="e.g. 3CSE" required>
                </div>

                <div class="form-group">
                    <label>Semester</label>
                    <input name="semester" type="number" min="1"
                        placeholder="e.g. 3" required>
                </div>

                <div class="form-group">
                    <label>Department</label>
                    <input name="department" placeholder="e.g. Computer Science" required>
                </div>

                <div class="form-group">
                    <label>Student Count</label>
                    <input name="student_count" type="number" min="1"
                        placeholder="Enter student count" required>
                </div>

                <button class="btn" type="submit">+ Add Section</button>
            </form>
        </div>

        <div class="panel">
            <div class="page-toolbar">
                <div>
                    <h3>Section Directory</h3>
                    <p style="color:#858ba3;font-size:12px">
                        All registered university sections
                    </p>
                </div>
                <input id="section-search" placeholder="Search sections..."
                    style="max-width:230px">
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Section</th>
                            <th>Semester</th>
                            <th>Department</th>
                            <th>Students</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="section-table">
                        ${data.map(s => `
                            <tr>
                                <td><strong>${escapeHTML(s.name)}</strong></td>
                                <td>Semester ${escapeHTML(s.semester)}</td>
                                <td>${escapeHTML(s.department)}</td>
                                <td>${escapeHTML(s.student_count)}</td>
                                <td>
                                    <button class="btn btn-danger"
                                        data-delete="${s.id}">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById("section-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = Object.fromEntries(new FormData(e.target));

        formData.semester = Number(formData.semester);
        formData.student_count = Number(formData.student_count);

        try {
            await request("/sections", {
                method: "POST",
                body: JSON.stringify(formData)
            });

            await loadSections();
            loadDashboardStats();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById("section-table").addEventListener("click", async (e) => {
        const button = e.target.closest("[data-delete]");
        if (!button) return;

        if (!confirm("Are you sure you want to delete this section?")) return;

        try {
            await request(`/sections/${button.dataset.delete}`, {
                method: "DELETE"
            });

            await loadSections();
            loadDashboardStats();
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById("section-search").addEventListener("input", (e) => {
        const search = e.target.value.toLowerCase();

        document.querySelectorAll("#section-table tr").forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(search)
                ? ""
                : "none";
        });
    });
}




async function loadRooms() {
    const data = await request("/rooms");

    const classrooms = data.filter(r => r.room_type === "CLASSROOM").length;
    const labs = data.filter(r => r.room_type === "LAB").length;

    const totalCapacity = data.reduce(
        (sum, room) => sum + Number(room.capacity || 0), 0
    );

    content.innerHTML = `
        <div class="page-heading">
            <h2>Room Management</h2>
            <p>Manage classrooms, laboratories, capacities and equipment.</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <p>Total Rooms</p>
                <h2>${data.length}</h2>
                <small>Registered facilities</small>
            </div>

            <div class="stat-card">
                <p>Classrooms</p>
                <h2>${classrooms}</h2>
                <small>Theory teaching rooms</small>
            </div>

            <div class="stat-card">
                <p>Laboratories</p>
                <h2>${labs}</h2>
                <small>Practical learning spaces</small>
            </div>

            <div class="stat-card">
                <p>Total Capacity</p>
                <h2>${totalCapacity}</h2>
                <small>Combined seating capacity</small>
            </div>
        </div>

        <div class="panel">
            <h3>Add New Room</h3>
            <p style="color:#858ba3;font-size:13px;margin-bottom:20px">
                Register a classroom or laboratory.
            </p>

            <form id="room-form" class="form-grid">

                <div class="form-group">
                    <label>Room Number</label>
                    <input name="room_number"
                        placeholder="e.g. CR101" required>
                </div>

                <div class="form-group">
                    <label>Room Type</label>
                    <select name="room_type" required>
                        <option value="CLASSROOM">Classroom</option>
                        <option value="LAB">Laboratory</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Seating Capacity</label>
                    <input name="capacity"
                        type="number" min="1"
                        placeholder="Enter capacity" required>
                </div>

                <div class="form-group" id="equipment-group"
                    style="display:none">

                    <label>Number of Equipments</label>
                    <input name="equipment_count"
                        type="number" min="0"
                        placeholder="Enter equipment count"
                        value="0">
                </div>

                <button class="btn" type="submit">
                    + Add Room
                </button>
            </form>
        </div>

        <div class="panel">
            <div class="page-toolbar">
                <div>
                    <h3>Room Directory</h3>
                    <p style="color:#858ba3;font-size:12px">
                        All registered classrooms and laboratories
                    </p>
                </div>

                <input id="room-search"
                    placeholder="Search rooms..."
                    style="max-width:230px">
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Room Number</th>
                            <th>Room Type</th>
                            <th>Capacity</th>
                            <th>Equipment</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody id="room-table">
                        ${data.map(r => `
                            <tr>
                                <td>
                                    <strong>${escapeHTML(r.room_number)}</strong>
                                </td>

                                <td>
                                    <span class="badge">
                                        ${r.room_type === "LAB"
            ? "Laboratory"
            : "Classroom"}
                                    </span>
                                </td>

                                <td>${escapeHTML(r.capacity)} seats</td>

                                <td>
                                    ${r.room_type === "LAB"
            ? `${Number(r.equipment_count || 0)} equipments`
            : "-"}
                                </td>

                                <td>
                                    <button class="btn btn-danger"
                                        data-delete="${r.id}">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        `).join("") || `
                            <tr>
                                <td colspan="5">No rooms added yet.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Show equipment field only for laboratories
    const roomTypeSelect = document.querySelector(
        '#room-form [name="room_type"]'
    );

    const equipmentGroup = document.getElementById("equipment-group");

    const equipmentInput = document.querySelector(
        '#room-form [name="equipment_count"]'
    );

    roomTypeSelect.addEventListener("change", () => {
        const isLab = roomTypeSelect.value === "LAB";

        equipmentGroup.style.display = isLab ? "block" : "none";
        equipmentInput.required = isLab;

        if (!isLab) {
            equipmentInput.value = 0;
        }
    });

    // Add room
    document.getElementById("room-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = Object.fromEntries(new FormData(e.target));

        formData.capacity = Number(formData.capacity);
        formData.equipment_count = Number(formData.equipment_count || 0);

        try {
            await request("/rooms", {
                method: "POST",
                body: JSON.stringify(formData)
            });

            alert("Room added successfully!");

            await loadRooms();
            loadDashboardStats();

        } catch (error) {
            alert(error.message);
        }
    });

    // Delete room
    document.getElementById("room-table").addEventListener("click", async (e) => {
        const button = e.target.closest("[data-delete]");

        if (!button) return;

        if (!confirm("Are you sure you want to delete this room?")) return;

        try {
            await request(`/rooms/${button.dataset.delete}`, {
                method: "DELETE"
            });

            await loadRooms();
            loadDashboardStats();

        } catch (error) {
            alert(error.message);
        }
    });

    // Search rooms
    document.getElementById("room-search").addEventListener("input", (e) => {
        const search = e.target.value.toLowerCase();

        document.querySelectorAll("#room-table tr").forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(search)
                ? ""
                : "none";
        });
    });
}




async function loadAssignments() {
    const [faculty, subjects, sections, assignments] = await Promise.all([
        request("/faculty"),
        request("/subjects"),
        request("/sections"),
        request("/assignments/section-subject")
    ]);

    content.innerHTML = `
        <div class="page-heading">
            <h2>Academic Assignments</h2>
            <p>Connect faculty members, academic subjects and student sections.</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <p>Faculty Members</p>
                <h2>${faculty.length}</h2>
                <small style="color:#858ba3">Available teaching staff</small>
            </div>
            <div class="stat-card">
                <p>Subjects</p>
                <h2>${subjects.length}</h2>
                <small style="color:#858ba3">Available courses</small>
            </div>
            <div class="stat-card">
                <p>Sections</p>
                <h2>${sections.length}</h2>
                <small style="color:#858ba3">Student groups</small>
            </div>
            <div class="stat-card">
                <p>Section Assignments</p>
                <h2>${assignments.length}</h2>
                <small style="color:#858ba3">Current subject allocations</small>
            </div>
        </div>

        <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px">

            <div class="panel">
                <h3>Faculty Allocation</h3>
                <p style="color:#858ba3;font-size:13px;margin-bottom:20px">
                    Assign an academic subject to a faculty member.
                </p>

                <form id="faculty-assignment">
                    <div class="form-group">
                        <label>Faculty Member</label>
                        <select name="faculty_id" required>
                            ${faculty.map(f => `
                                <option value="${f.id}">${escapeHTML(f.name)}</option>
                            `).join("")}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Academic Subject</label>
                        <select name="subject_id" required>
                            ${subjects.map(s => `
                                <option value="${s.id}">${escapeHTML(s.name)} (${escapeHTML(s.code)})</option>
                            `).join("")}
                        </select>
                    </div>

                    <button class="btn" type="submit" style="width:100%">
                        Assign Faculty
                    </button>
                </form>
            </div>

            <div class="panel">
                <h3>Section Allocation</h3>
                <p style="color:#858ba3;font-size:13px;margin-bottom:20px">
                    Assign a subject and its faculty member to a section.
                </p>

                <form id="section-assignment">
                    <div class="form-group">
                        <label>Student Section</label>
                        <select name="section_id" required>
                            ${sections.map(s => `
                                <option value="${s.id}">${escapeHTML(s.name)}</option>
                            `).join("")}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Academic Subject</label>
                        <select name="subject_id" required>
                            ${subjects.map(s => `
                                <option value="${s.id}">${escapeHTML(s.name)} (${escapeHTML(s.code)})</option>
                            `).join("")}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Faculty Member</label>
                        <select name="faculty_id" required>
                            ${faculty.map(f => `
                                <option value="${f.id}">${escapeHTML(f.name)}</option>
                            `).join("")}
                        </select>
                    </div>

                    <button class="btn" type="submit" style="width:100%">
                        Assign to Section
                    </button>
                </form>
            </div>

        </div>

        <div class="panel">
            <div class="page-toolbar">
                <div>
                    <h3>Current Section Assignments</h3>
                    <p style="color:#858ba3;font-size:12px">
                        Overview of subject and faculty allocations
                    </p>
                </div>
                <input id="assignment-search" placeholder="Search assignments..."
                    style="max-width:230px">
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Section</th>
                            <th>Subject</th>
                            <th>Faculty Member</th>
                        </tr>
                    </thead>
                    <tbody id="assignment-table">
                        ${assignments.map(a => `
                            <tr>
                                <td><strong>${escapeHTML(a.section)}</strong></td>
                                <td>${escapeHTML(a.subject)}</td>
                                <td>${escapeHTML(a.faculty)}</td>
                            </tr>
                        `).join("") || `
                            <tr>
                                <td colspan="3" style="text-align:center;color:#858ba3">
                                    No assignments available yet.
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById("faculty-assignment").onsubmit = async e => {
        e.preventDefault();

        try {
            await request("/assignments/faculty-subject", {
                method: "POST",
                body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
            });

            showMessage("Faculty assignment added!");
            await loadAssignments();
        } catch (error) {
            showMessage(error.message);
        }
    };

    document.getElementById("section-assignment").onsubmit = async e => {
        e.preventDefault();

        try {
            await request("/assignments/section-subject", {
                method: "POST",
                body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
            });

            showMessage("Section assignment added!");
            await loadAssignments();
        } catch (error) {
            showMessage(error.message);
        }
    };

    document.getElementById("assignment-search").addEventListener("input", e => {
        const search = e.target.value.toLowerCase();

        document.querySelectorAll("#assignment-table tr").forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(search)
                ? ""
                : "none";
        });
    });
}

async function generateTimetable() {
    if (!confirm("Generate a new timetable? The existing timetable will be replaced if successful.")) return;

    try {
        const result = await request("/timetable/generate", {
            method: "POST",
            body: JSON.stringify({})
        });

        showMessage(`${result.message} Total classes: ${result.total_classes}`);
        await loadTimetable();
    } catch (error) {
        showMessage(error.message);
    }
}


async function loadTimetable() {
    const rows = await request("/timetable");

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    const slots = [...new Map(rows.map(r => [
        `${r.start_time}-${r.end_time}`,
        { start: r.start_time, end: r.end_time }
    ])).values()].sort((a, b) => a.start.localeCompare(b.start));

    const totalClasses = rows.length;
    const totalSubjects = new Set(rows.map(r => r.subject)).size;
    const totalSections = new Set(rows.map(r => r.section)).size;
    const totalFaculty = new Set(rows.map(r => r.faculty)).size;

    content.innerHTML = `
        <div class="page-heading">
            <h2>Timetable Management</h2>
            <p>Manage and monitor your university's weekly academic schedule.</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <p>Scheduled Classes</p>
                <h2>${totalClasses}</h2>
                <small style="color:#858ba3">Total weekly sessions</small>
            </div>
            <div class="stat-card">
                <p>Subjects</p>
                <h2>${totalSubjects}</h2>
                <small style="color:#858ba3">Scheduled courses</small>
            </div>
            <div class="stat-card">
                <p>Sections</p>
                <h2>${totalSections}</h2>
                <small style="color:#858ba3">Sections covered</small>
            </div>
            <div class="stat-card">
                <p>Faculty</p>
                <h2>${totalFaculty}</h2>
                <small style="color:#858ba3">Teaching staff allocated</small>
            </div>
        </div>

        <div class="panel">
            <div class="page-toolbar">
                <div>
                    <h3>Weekly Schedule</h3>
                    <p style="color:#858ba3;font-size:12px">
                        Monday to Friday · Generated academic timetable
                    </p>
                </div>

                <div style="display:flex;gap:10px;flex-wrap:wrap">
                    <button class="btn" id="generate-btn">
                        Generate Timetable
                    </button>

                    <button class="btn" id="download-pdf-btn"
                        ${rows.length === 0 ? "disabled" : ""}>
                        Download PDF
                    </button>
                </div>
            </div>

            ${rows.length === 0 ? `
                <div style="text-align:center;padding:55px 15px">
                    <h3>No Timetable Generated</h3>
                    <p style="color:#858ba3;font-size:13px;margin:12px 0 20px">
                        Generate a timetable to view the weekly class schedule.
                    </p>
                    <button class="btn" id="empty-generate-btn">
                        Generate First Timetable
                    </button>
                </div>
            ` : `
                <div class="table-container">
                    <table style="min-width:850px">
                        <thead>
                            <tr>
                                <th style="min-width:125px">Time Slot</th>
                                ${days.map(day => `
                                    <th>${day}</th>
                                `).join("")}
                            </tr>
                        </thead>

                        <tbody>
                            ${slots.map(slot => `
                                <tr>
                                    <td>
                                        <strong>${escapeHTML(slot.start)}</strong>
                                        <br>
                                        <small style="color:#858ba3">
                                            ${escapeHTML(slot.end)}
                                        </small>
                                    </td>

                                    ${days.map(day => {
        const classes = rows.filter(r =>
            r.day === day &&
            r.start_time === slot.start
        );

        return `
                                            <td style="min-width:155px;vertical-align:top">
                                                ${classes.map(r => `
                                                    <div class="class-card" style="
                                                        margin:3px 0;
                                                        padding:12px;
                                                        border-radius:9px;
                                                        background:#f0efff;
                                                        border-left:3px solid #635bdb;
                                                    ">
                                                        <strong style="color:#39346c;font-size:12px">
                                                            ${escapeHTML(r.subject)}
                                                        </strong>

                                                        <p style="font-size:11px;margin-top:6px">
                                                            ${escapeHTML(r.section)}
                                                        </p>

                                                        <p style="font-size:11px;color:#656b82">
                                                            ${escapeHTML(r.faculty)}
                                                        </p>

                                                        <p style="font-size:10px;color:#635bdb;margin-top:5px">
                                                            <strong>Room:</strong> ${escapeHTML(r.room)}
                                                        </p>
                                                    </div>
                                                `).join("")}
                                            </td>
                                        `;
    }).join("")}
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `}

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                flex-wrap:wrap;
                gap:12px;
                margin-top:22px;
                padding-top:18px;
                border-top:1px solid #eeeef4;
            ">
                <p style="font-size:12px;color:#858ba3">
                    ${totalClasses} classes scheduled across ${days.length} weekdays
                </p>

                <button class="btn btn-danger" id="clear-btn">
                    Clear Timetable
                </button>
            </div>
        </div>
    `;

    document.getElementById("generate-btn").onclick = generateTimetable;
    document.getElementById("download-pdf-btn").onclick =
    () => downloadTimetablePDF(rows);
    const emptyGenerateBtn = document.getElementById("empty-generate-btn");

    if (emptyGenerateBtn) {
        emptyGenerateBtn.onclick = generateTimetable;
    }

    document.getElementById("clear-btn").onclick = async () => {
        if (!confirm("Are you sure you want to clear the entire timetable?")) return;

        try {
            await request("/timetable/clear", { method: "DELETE" });
            showMessage("Timetable cleared successfully!");
            await loadTimetable();
            loadDashboardStats();
        } catch (error) {
            showMessage(error.message);
        }
    };
}

function downloadTimetablePDF(rows) {
    if (!rows || rows.length === 0) {
        alert("No timetable available to download.");
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF library not loaded. Please refresh the page.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("landscape", "mm", "a4");

    const days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday"
    ];

    const slots = [...new Map(
        rows.map(r => [
            `${r.start_time}-${r.end_time}`,
            {
                start: r.start_time,
                end: r.end_time
            }
        ])
    ).values()].sort((a, b) =>
        a.start.localeCompare(b.start)
    );

    const body = slots.map(slot => {
        const row = [
            `${slot.start}\n${slot.end}`
        ];

        days.forEach(day => {
            const classes = rows.filter(r =>
                r.day === day &&
                r.start_time === slot.start
            );

            const cellContent = classes.map(r =>
                `${r.subject}\n${r.section}\n${r.faculty}\nRoom: ${r.room}`
            );

            row.push(cellContent.join("\n\n"));
        });

        return row;
    });

    // PDF heading
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("TIMETABLEFORGE", 14, 14);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Weekly Academic Timetable", 14, 21);

    doc.setFontSize(9);
    doc.text(
        `Generated: ${new Date().toLocaleDateString()}`,
        14,
        27
    );

    // Timetable table
    doc.autoTable({
        startY: 32,
        head: [[
            "Time Slot",
            ...days
        ]],
        body: body,
        theme: "grid",

        styles: {
            fontSize: 7,
            cellPadding: 3,
            overflow: "linebreak",
            valign: "top",
            lineColor: [220, 220, 230],
            lineWidth: 0.2
        },

        headStyles: {
            fillColor: [63, 58, 130],
            textColor: 255,
            fontStyle: "bold",
            halign: "center"
        },

        columnStyles: {
            0: {
                cellWidth: 25,
                fontStyle: "bold"
            }
        },

        margin: {
            left: 10,
            right: 10
        },

        didDrawPage: function () {
            const pageHeight =
                doc.internal.pageSize.height;

            doc.setFontSize(8);
            doc.text(
                "Generated by TimetableForge",
                14,
                pageHeight - 7
            );

            doc.text(
                `Page ${doc.internal.getNumberOfPages()}`,
                doc.internal.pageSize.width - 25,
                pageHeight - 7
            );
        }
    });

    doc.save("TimetableForge-Weekly-Timetable.pdf");
}


async function loadUsers() {
    const [faculty, sections] = await Promise.all([
        request("/faculty"),
        request("/sections")
    ]);

    content.innerHTML = `
        <div class="page-heading">
            <h2>User Management</h2>
            <p>Create and manage access accounts for your university.</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <p>Available Faculty</p>
                <h2>${faculty.length}</h2>
                <small style="color:#858ba3">For teacher accounts</small>
            </div>

            <div class="stat-card">
                <p>Available Sections</p>
                <h2>${sections.length}</h2>
                <small style="color:#858ba3">For student accounts</small>
            </div>
        </div>

        <div class="panel">
            <h3>Create New User</h3>
            <p style="color:#858ba3;font-size:13px;margin-bottom:22px">
                Create login credentials and assign an appropriate role.
            </p>

            <form id="user-form" class="form-grid">

                <div class="form-group">
                    <label>Full Name</label>
                    <input name="name" placeholder="Enter full name" required>
                </div>

                <div class="form-group">
                    <label>Email Address</label>
                    <input name="email" type="email" placeholder="Enter email address" required>
                </div>

                <div class="form-group">
                    <label>Password</label>
                    <input name="password" type="password"
                        placeholder="Minimum 8 characters"
                        minlength="8" required>
                </div>

                <div class="form-group">
                    <label>Account Role</label>
                    <select name="role" id="user-role" required>
                        <option value="TEACHER">Teacher</option>
                        <option value="STUDENT">Student</option>
                    </select>
                </div>

                <div class="form-group" id="faculty-field" style="display:none">
                    <label>Select Faculty</label>
                    <select name="faculty_id" id="user-faculty">
                        <option value="">Select faculty member</option>
                        ${faculty.map(f => `
                            <option value="${f.id}">
                                ${escapeHTML(f.name)}
                            </option>
                        `).join("")}
                    </select>
                </div>

                <div class="form-group" id="section-field" style="display:none">
                    <label>Select Section</label>
                    <select name="section_id" id="user-section">
                        <option value="">Select section</option>
                        ${sections.map(s => `
                            <option value="${s.id}">
                                ${escapeHTML(s.name)}
                            </option>
                        `).join("")}
                    </select>
                </div>

                <div style="grid-column:1/-1">
                    <button class="btn" type="submit" id="create-user-btn">
                        + Create Account
                    </button>
                </div>

                <p id="user-message"
                    style="grid-column:1/-1;font-size:13px;margin-top:5px">
                </p>
            </form>
        </div>
    `;

    const form = document.getElementById("user-form");
    const roleSelect = document.getElementById("user-role");
    const facultyField = document.getElementById("faculty-field");
    const sectionField = document.getElementById("section-field");
    const facultySelect = document.getElementById("user-faculty");
    const sectionSelect = document.getElementById("user-section");

    function updateRoleFields() {
        const role = roleSelect.value;

        facultyField.style.display =
            role === "TEACHER" ? "block" : "none";

        sectionField.style.display =
            role === "STUDENT" ? "block" : "none";

        facultySelect.required = role === "TEACHER";
        sectionSelect.required = role === "STUDENT";
    }

    roleSelect.addEventListener("change", updateRoleFields);
    updateRoleFields();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const message = document.getElementById("user-message");
        const button = document.getElementById("create-user-btn");

        const formData = new FormData(form);

        const userData = {
            name: formData.get("name").trim(),
            email: formData.get("email").trim(),
            password: formData.get("password"),
            role: formData.get("role"),
            faculty_id: formData.get("faculty_id") || null,
            section_id: formData.get("section_id") || null
        };

        button.disabled = true;
        button.textContent = "Creating Account...";
        message.textContent = "";

        try {
            const result = await request("/users/create", {
                method: "POST",
                body: JSON.stringify(userData)
            });

            message.style.color = "#198754";
            message.textContent = result.message;

            form.reset();
            updateRoleFields();

        } catch (error) {
            message.style.color = "#dc3545";
            message.textContent = error.message;

        } finally {
            button.disabled = false;
            button.textContent = "+ Create Account";
        }
    });
}


async function loadRegistrations() {
    const requests = await request("/users/registration-requests");

    content.innerHTML = `
        <div class="page-heading">
            <h2>Registration Requests</h2>
            <p>Review and manage student and teacher registration applications.</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <p>Pending Requests</p>
                <h2>${requests.length}</h2>
                <small style="color:#858ba3">Awaiting approval</small>
            </div>
        </div>

        <div class="panel">
            <div class="page-toolbar">
                <div>
                    <h3>Pending Applications</h3>
                    <p style="color:#858ba3;font-size:12px">
                        Approve or reject account registration requests.
                    </p>
                </div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Department / Section</th>
                            <th>Requested At</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody id="registration-table">
                        ${requests.map(r => `
                            <tr>
                                <td><strong>${escapeHTML(r.name)}</strong></td>
                                <td>${escapeHTML(r.email)}</td>
                                <td>${escapeHTML(r.role)}</td>
                                <td>
                                    ${r.role === "STUDENT"
            ? `${escapeHTML(r.section_name || "-")} - Semester ${escapeHTML(r.semester ?? "-")}`
            : escapeHTML(r.department || "-")
        }
                                </td>
                                <td>${escapeHTML(new Date(r.requested_at).toLocaleDateString())}</td>
                                <td>
                                    <button class="btn" data-approve="${r.id}">
                                        Approve
                                    </button>

                                    <button class="btn btn-danger" data-reject="${r.id}">
                                        Reject
                                    </button>
                                </td>
                            </tr>
                        `).join("") || `
                            <tr>
                                <td colspan="6" style="text-align:center;padding:25px">
                                    No pending registration requests.
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById("registration-table").addEventListener("click", async (e) => {
        const approveButton = e.target.closest("[data-approve]");
        const rejectButton = e.target.closest("[data-reject]");

        if (!approveButton && !rejectButton) return;

        const id = approveButton
            ? approveButton.dataset.approve
            : rejectButton.dataset.reject;

        const action = approveButton ? "approve" : "reject";

        if (action === "reject" &&
            !confirm("Are you sure you want to reject this registration?")) {
            return;
        }

        try {
            const result = await request(
                `/users/${action}-registration/${id}`,
                { method: "POST" }
            );

            showMessage(
                result.message ||
                `Registration ${action === "approve" ? "approved" : "rejected"} successfully!`
            );

            await loadRegistrations();

        } catch (error) {
            showMessage(error.message);
        }
    });
}




async function loadPage(page) {
    currentPage = page;

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.toggle("active", item.dataset.page === page);
    });

    const titles = {
        dashboard: "Dashboard",
        faculty: "Faculty",
        subjects: "Subjects",
        sections: "Sections",
        rooms: "Rooms",
        assignments: "Assignments",
        users: "User Management",
        registrations: "Registration Requests",
        timetable: "Timetable"
    };

    pageTitle.textContent = titles[page] || "Dashboard";

    try {
        const pages = {
            dashboard: loadDashboardStats,
            faculty: loadFaculty,
            subjects: loadSubjects,
            sections: loadSections,
            rooms: loadRooms,
            assignments: loadAssignments,
            users: loadUsers,
            registrations: loadRegistrations,
            timetable: loadTimetable
        };

        if (!pages[page]) {
            throw new Error("Page not found.");
        }

        await pages[page]();

    } catch (error) {
        content.innerHTML = `
            <div class="panel">
                <h3>Unable to load page</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
}

document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => loadPage(item.dataset.page));
});



const adminSection = document.querySelector(".admin");

adminSection.innerHTML = `
    <div class="avatar">A</div>
    <div>
        <strong>${escapeHTML(user.name)}</strong>
        <small>System Administrator</small>
    </div>
    <button id="logoutBtn" class="btn">Logout</button>
`;

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
});

loadPage("dashboard");
