
const loginForm = document.getElementById("loginForm");

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

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.role === "ADMIN") {
            window.location.href = "index.html";
        } else if (data.user.role === "TEACHER") {
            window.location.href = "teacher.html";
        } else if (data.user.role === "STUDENT") {
            window.location.href = "student.html";
        } else {
            throw new Error("Unknown user role.");
        }

    } catch (error) {
        message.textContent = error.message;
        message.style.color = "#dc3545";

        button.disabled = false;
        button.textContent = "Sign In";
    }
});
