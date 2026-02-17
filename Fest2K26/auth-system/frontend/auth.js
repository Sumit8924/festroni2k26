const API = "http://localhost:5000/api/auth";

async function signup() {
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();
    const termsChecked = document.getElementById("terms").checked;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        showMessage("Please fill all fields", "error");
        return;
    }

    if (password !== confirmPassword) {
        showMessage("Passwords do not match", "error");
        return;
    }

    if (!termsChecked) {
        showMessage("Accept terms & conditions", "error");
        return;
    }

    try {
        const res = await fetch("http://localhost:5000/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                firstName,
                lastName,
                email,
                password,
                profilePicture: userProfilePicture
            })
        });

        const data = await res.json();

        if (!res.ok) {
            showMessage(data.msg, "error");
            return;
        }

        showMessage("Signup successful! Redirecting to login...", "success");

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1500);

    } catch (err) {
        showMessage("Server error", "error");
    }
}


async function login() {
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value.trim();

    const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.token) {
        localStorage.setItem("token", data.token);
        alert("Welcome " + data.name);
    } else {
        alert(data.msg);
    }
}
