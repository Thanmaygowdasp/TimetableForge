
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const adminRegisterForm = document.getElementById("adminRegisterForm");

const loginOptions = document.getElementById("loginOptions");
const roleSelection = document.getElementById("roleSelection");

const userLoginOption = document.getElementById("userLoginOption");
const adminLoginOption = document.getElementById("adminLoginOption");
const continueUserBtn = document.getElementById("continueUserBtn");

const userRole = document.getElementById("userRole");

const formTitle = document.getElementById("formTitle");
const formDescription = document.getElementById("formDescription");

const backBtn = document.getElementById("backBtn");

const registerPrompt = document.getElementById("registerPrompt");
const showRegisterBtn = document.getElementById("showRegisterBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");

const adminRegisterPrompt = document.getElementById("adminRegisterPrompt");
const showAdminRegisterBtn = document.getElementById("showAdminRegisterBtn");
const adminBackToLoginBtn = document.getElementById("adminBackToLoginBtn");

const sectionGroup = document.getElementById("sectionGroup");
const departmentGroup = document.getElementById("departmentGroup");
const registerDepartment = document.getElementById("registerDepartment");
const registerSection = document.getElementById("registerSection");


let selectedRole = null;


// ==========================================
// SHOW LOGIN FORM
// ==========================================

function showLoginForm(role) {
    selectedRole = role;

    loginOptions.style.display = "none";
    roleSelection.style.display = "none";
    registerForm.style.display = "none";
    adminRegisterForm.style.display = "none";
    loginForm.style.display = "block";

    backBtn.style.display = "inline-block";

    registerPrompt.style.display =
        role === "STUDENT" || role === "TEACHER" ? "block" : "none";

    adminRegisterPrompt.style.display =
        role === "ADMIN" ? "block" : "none";

    formTitle.textContent =
        role === "ADMIN" ? "Administrator Login" :
            role === "STUDENT" ? "Student Login" :
                "Teacher Login";

    formDescription.textContent =
        role === "ADMIN"
            ? "Sign in to manage university scheduling."
            : role === "STUDENT"
                ? "Access your academic timetable."
                : "Access your teaching timetable.";
}


// ==========================================
// STUDENT / TEACHER OPTION
// ==========================================

userLoginOption.addEventListener("click", () => {
    loginOptions.style.display = "none";
    roleSelection.style.display = "block";

    formTitle.textContent = "Choose Your Role";
    formDescription.textContent =
        "Select Student or Teacher to continue.";

    backBtn.style.display = "inline-block";
});


// ==========================================
// CONTINUE AFTER ROLE SELECTION
// ==========================================

continueUserBtn.addEventListener("click", () => {
    const role = userRole.value;

    if (!role) {
        alert("Please select your role.");
        return;
    }

    showLoginForm(role);
});


// ==========================================
// ADMIN LOGIN OPTION
// ==========================================

adminLoginOption.addEventListener("click", () => {
    showLoginForm("ADMIN");
});


// ==========================================
// BACK BUTTON
// ==========================================

backBtn.addEventListener("click", () => {
    loginForm.style.display = "none";
    registerForm.style.display = "none";
    adminRegisterForm.style.display = "none";
    roleSelection.style.display = "none";
    loginOptions.style.display = "block";

    loginForm.reset();
    registerForm.reset();
    adminRegisterForm.reset();

    userRole.value = "";
    selectedRole = null;

    registerPrompt.style.display = "none";
    adminRegisterPrompt.style.display = "none";

    formTitle.textContent = "Welcome Back";
    formDescription.textContent =
        "Select your account type to continue.";

    backBtn.style.display = "none";

    document.getElementById("loginMessage").textContent = "";
    document.getElementById("registerMessage").textContent = "";
    document.getElementById("adminRegisterMessage").textContent = "";
});


// ==========================================
// LOGIN API
// ==========================================

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const message = document.getElementById("loginMessage");
    const button = document.getElementById("loginBtn");

    button.disabled = true;
    button.textContent = "Signing in...";
    message.textContent = "";

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Login failed.");
        }

        if (data.user.role !== selectedRole) {
            throw new Error(
                "This account does not belong to the selected login type."
            );
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.role === "ADMIN") {
            window.location.href = "index.html";
        } else if (data.user.role === "TEACHER") {
            window.location.href = "teacher.html";
        } else if (data.user.role === "STUDENT") {
            window.location.href = "student.html";
        }

    } catch (error) {
        message.textContent = error.message;
        message.style.color = "#dc3545";

        button.disabled = false;
        button.textContent = "Sign In";
    }
});


// ==========================================
// SHOW STUDENT / TEACHER REGISTRATION FORM
// ==========================================

showRegisterBtn.addEventListener("click", async () => {
    loginForm.style.display = "none";
    registerForm.style.display = "block";

    registerPrompt.style.display = "none";
    adminRegisterPrompt.style.display = "none";

    sectionGroup.style.display =
        selectedRole === "STUDENT" ? "block" : "none";

    departmentGroup.style.display =
        selectedRole === "TEACHER" ? "block" : "none";

    formTitle.textContent =
        selectedRole === "STUDENT"
            ? "Student Registration"
            : "Teacher Registration";

    formDescription.textContent =
        "Submit your details for administrator approval.";

    document.getElementById("registerMessage").textContent = "";

    await loadRegistrationOptions();
});


// ==========================================
// LOAD FACULTY AND SECTION OPTIONS
// ==========================================

async function loadRegistrationOptions() {
    try {
        registerSection.innerHTML =
            '<option value="">Loading sections...</option>';

        const response = await fetch("/api/users/registration-options");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to load registration options."
            );
        }

        registerSection.innerHTML =
            '<option value="">Select your section</option>';

        data.sections.forEach(section => {
            const option = document.createElement("option");

            option.value = section.id;
            option.textContent =
                `${section.name} - Semester ${section.semester} (${section.department})`;

            registerSection.appendChild(option);
        });

    } catch (error) {
        document.getElementById("registerMessage").textContent =
            error.message;

        document.getElementById("registerMessage").style.color = "#dc3545";
    }
}


// ==========================================
// BACK TO STUDENT / TEACHER LOGIN
// ==========================================

backToLoginBtn.addEventListener("click", () => {
    registerForm.style.display = "none";
    loginForm.style.display = "block";

    registerForm.reset();

    formTitle.textContent =
        selectedRole === "STUDENT"
            ? "Student Login"
            : "Teacher Login";

    formDescription.textContent =
        selectedRole === "STUDENT"
            ? "Access your academic timetable."
            : "Access your teaching timetable.";

    registerPrompt.style.display = "block";

    document.getElementById("registerMessage").textContent = "";
});


// ==========================================
// STUDENT / TEACHER REGISTRATION API
// ==========================================

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword =
        document.getElementById("registerConfirmPassword").value;

    const message = document.getElementById("registerMessage");
    const button = document.getElementById("registerBtn");

    if (password !== confirmPassword) {
        message.textContent = "Passwords do not match.";
        message.style.color = "#dc3545";
        return;
    }

    if (password.length < 8) {
        message.textContent =
            "Password must contain at least 8 characters.";

        message.style.color = "#dc3545";
        return;
    }

    const registrationData = {
        name,
        email,
        password,
        role: selectedRole,
        department:
            selectedRole === "TEACHER"
                ? registerDepartment.value
                : null,
        section_id:
            selectedRole === "STUDENT"
                ? registerSection.value
                : null
    };

    if (
        selectedRole === "STUDENT" &&
        !registrationData.section_id
    ) {
        message.textContent = "Please select your section.";
        message.style.color = "#dc3545";
        return;
    }

    if (
        selectedRole === "TEACHER" &&
        !registrationData.department
    ) {
        message.textContent = "Please select your department.";
        message.style.color = "#dc3545";
        return;
    }

    button.disabled = true;
    button.textContent = "Submitting...";
    message.textContent = "";

    try {
        const response = await fetch("/api/users/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(registrationData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Registration failed."
            );
        }

        registerForm.style.display = "none";
        loginForm.style.display = "block";

        loginForm.reset();
        registerForm.reset();

        formTitle.textContent = "Registration Submitted";

        formDescription.textContent =
            "Your request is waiting for administrator approval.";

        document.getElementById("loginMessage").textContent =
            data.message;

        document.getElementById("loginMessage").style.color =
            "#198754";

        registerPrompt.style.display = "none";

    } catch (error) {
        message.textContent = error.message;
        message.style.color = "#dc3545";

    } finally {
        button.disabled = false;
        button.textContent = "Submit Registration →";
    }
});


// ==========================================
// SHOW ADMIN REGISTRATION FORM
// ==========================================

showAdminRegisterBtn.addEventListener("click", () => {
    loginForm.style.display = "none";
    adminRegisterForm.style.display = "block";

    registerPrompt.style.display = "none";
    adminRegisterPrompt.style.display = "none";

    formTitle.textContent = "Administrator Registration";
    formDescription.textContent =
        "Register using your administrator secret key.";

    document.getElementById("adminRegisterMessage").textContent = "";
});


// ==========================================
// ADMIN REGISTRATION API
// ==========================================

adminRegisterForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name =
        document.getElementById("adminRegisterName").value.trim();

    const email =
        document.getElementById("adminRegisterEmail").value.trim();

    const password =
        document.getElementById("adminRegisterPassword").value;

    const confirmPassword =
        document.getElementById("adminConfirmPassword").value;

    const secretKey =
        document.getElementById("adminSecretKey").value;

    const message =
        document.getElementById("adminRegisterMessage");

    const button =
        document.getElementById("adminRegisterBtn");

    if (password !== confirmPassword) {
        message.textContent = "Passwords do not match.";
        message.style.color = "#dc3545";
        return;
    }

    if (password.length < 8) {
        message.textContent =
            "Password must contain at least 8 characters.";

        message.style.color = "#dc3545";
        return;
    }

    button.disabled = true;
    button.textContent = "Registering...";
    message.textContent = "";

    try {
        const response = await fetch("/api/auth/register-admin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                password,
                secretKey
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Administrator registration failed."
            );
        }

        adminRegisterForm.reset();
        adminRegisterForm.style.display = "none";
        loginForm.style.display = "block";

        formTitle.textContent = "Administrator Account Created";
        formDescription.textContent =
            "Your administrator account is ready. Sign in to continue.";

        document.getElementById("loginMessage").textContent =
            data.message || "Administrator account created successfully.";

        document.getElementById("loginMessage").style.color =
            "#198754";

        adminRegisterPrompt.style.display = "none";

    } catch (error) {
        message.textContent = error.message;
        message.style.color = "#dc3545";

    } finally {
        button.disabled = false;
        button.textContent = "Register Administrator →";
    }
});


// ==========================================
// ADMIN BACK TO LOGIN
// ==========================================

adminBackToLoginBtn.addEventListener("click", () => {
    adminRegisterForm.style.display = "none";
    loginForm.style.display = "block";

    adminRegisterForm.reset();

    formTitle.textContent = "Administrator Login";
    formDescription.textContent =
        "Sign in to manage university scheduling.";

    adminRegisterPrompt.style.display = "block";

    document.getElementById("adminRegisterMessage").textContent = "";
});
