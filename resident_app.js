// ========================================
// SUPABASE CONFIGURATION
// ========================================

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_KEY = "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ========================================
// HTML ELEMENTS
// ========================================

const loginSection = document.getElementById("loginSection");
const registerSection = document.getElementById("registerSection");
const dashboardSection = document.getElementById("dashboardSection");

const requestSection = document.getElementById("requestSection");
const requestsSection = document.getElementById("requestsSection");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const requestForm = document.getElementById("requestForm");

const loginMessage = document.getElementById("loginMessage");
const registerMessage = document.getElementById("registerMessage");
const requestMessage = document.getElementById("requestMessage");

let currentUser = null;

// ========================================
// SHOW AND HIDE SECTIONS
// ========================================

function showLogin() {
    loginSection.classList.remove("hidden");
    registerSection.classList.add("hidden");
    dashboardSection.classList.add("hidden");

    loginMessage.textContent = "";
    registerMessage.textContent = "";
}

function showRegister() {
    loginSection.classList.add("hidden");
    registerSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");

    loginMessage.textContent = "";
    registerMessage.textContent = "";
}

function showDashboard() {
    loginSection.classList.add("hidden");
    registerSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");

    requestSection.classList.add("hidden");
    requestsSection.classList.add("hidden");
}

function showRequestForm() {
    requestSection.classList.remove("hidden");
    requestsSection.classList.add("hidden");

    requestMessage.textContent = "";
}

async function showRequests() {
    requestSection.classList.add("hidden");
    requestsSection.classList.remove("hidden");

    await loadRequests();
}

// ========================================
// NAVIGATION BUTTONS
// ========================================

document.getElementById("showRegister").addEventListener("click", (event) => {
    event.preventDefault();
    showRegister();
});

document.getElementById("showLogin").addEventListener("click", (event) => {
    event.preventDefault();
    showLogin();
});

document.getElementById("showRequestButton").addEventListener("click", () => {
    showRequestForm();
});

document.getElementById("showRequestsButton").addEventListener("click", () => {
    showRequests();
});

document.getElementById("cancelRequestButton").addEventListener("click", () => {
    requestSection.classList.add("hidden");
});

document.getElementById("refreshRequestsButton").addEventListener("click", () => {
    loadRequests();
});

// ========================================
// RESIDENT REGISTRATION
// ========================================

registerForm.addEventListener("submit", async(event) => {
    event.preventDefault();

    registerMessage.textContent = "Creating account...";

    const fullName = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
        registerMessage.textContent = "Passwords do not match.";
        return;
    }

    if (password.length < 6) {
        registerMessage.textContent = "Password must be at least 6 characters.";
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: fullName
            }
        }
    });

    if (error) {
        registerMessage.textContent = error.message;
        return;
    }

    registerForm.reset();

    if (data.session) {
        registerMessage.textContent = "Account created successfully. You can now use the resident portal.";
        currentUser = data.user;
        await displayDashboard();
    } else {
        registerMessage.textContent =
            "Account created! Check your email to confirm your account, then return to login.";
    }
});

// ========================================
// RESIDENT LOGIN
// ========================================

loginForm.addEventListener("submit", async(event) => {
    event.preventDefault();

    loginMessage.textContent = "Signing in...";

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        loginMessage.textContent = error.message;
        return;
    }

    currentUser = data.user;

    loginForm.reset();

    await displayDashboard();
});

// ========================================
// DISPLAY DASHBOARD
// ========================================

async function displayDashboard() {
    if (!currentUser) return;

    const fullName =
        (currentUser.user_metadata && currentUser.user_metadata.full_name) ||
        currentUser.email ||
        "Resident";

    document.getElementById("residentName").textContent = fullName;

    showDashboard();

    // Prefill resident name in the request form
    document.getElementById("fullName").value = fullName;

    await loadRequests();
}

// ========================================
// LOGOUT
// ========================================

document.getElementById("logoutButton").addEventListener("click", async() => {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert("Unable to log out: " + error.message);
        return;
    }

    currentUser = null;
    showLogin();
});

// ========================================
// SUBMIT DOCUMENT REQUEST
// ========================================

requestForm.addEventListener("submit", async(event) => {
    event.preventDefault();

    if (!currentUser) {
        requestMessage.textContent = "Please log in first.";
        return;
    }

    requestMessage.textContent = "Submitting request...";

    const requestData = {
        resident_id: currentUser.id,
        full_name: document.getElementById("fullName").value.trim(),
        age: Number(document.getElementById("age").value),
        birthplace: document.getElementById("birthplace").value.trim(),
        address: document.getElementById("address").value.trim(),
        contact_number: document.getElementById("contactNumber").value.trim(),
        document_type: document.getElementById("documentType").value,
        purpose: document.getElementById("purpose").value.trim()
    };

    const { error } = await supabaseClient
        .from("document_requests")
        .insert([requestData]);

    if (error) {
        requestMessage.textContent = "Request failed: " + error.message;
        return;
    }

    requestMessage.textContent = "Document request submitted successfully!";

    requestForm.reset();

    document.getElementById("fullName").value =
        currentUser.user_metadata?.full_name || "";

    await loadRequests();
});

// ========================================
// LOAD RESIDENT REQUEST HISTORY
// ========================================

async function loadRequests() {
    if (!currentUser) return;

    const requestsList = document.getElementById("requestsList");

    requestsList.replaceChildren();

    const loadingText = document.createElement("p");
    loadingText.textContent = "Loading requests...";
    requestsList.appendChild(loadingText);

    const { data, error } = await supabaseClient
        .from("document_requests")
        .select("*")
        .eq("resident_id", currentUser.id)
        .order("created_at", { ascending: false });

    requestsList.replaceChildren();

    if (error) {
        const errorText = document.createElement("p");
        errorText.textContent = "Unable to load requests: " + error.message;
        requestsList.appendChild(errorText);
        return;
    }

    if (!data || data.length === 0) {
        const emptyText = document.createElement("p");
        emptyText.textContent = "You have not submitted any document requests.";
        requestsList.appendChild(emptyText);
        return;
    }

    data.forEach((request) => {
        const item = document.createElement("div");
        item.className = "request-item";

        const title = document.createElement("h3");
        title.textContent = request.document_type;

        const status = document.createElement("span");
        status.className = "status";

        const statusText = request.status || "Pending";
        status.textContent = statusText;

        if (statusText === "Approved") {
            status.classList.add("approved");
        } else if (statusText === "Ready for Pickup") {
            status.classList.add("ready");
        } else if (statusText === "Rejected") {
            status.classList.add("rejected");
        }

        const purpose = document.createElement("p");
        purpose.textContent = "Purpose: " + request.purpose;

        const date = document.createElement("p");
        date.textContent =
            "Date Submitted: " +
            new Date(request.created_at).toLocaleString();

        const requestId = document.createElement("p");
        requestId.textContent = "Request ID: " + request.id;

        item.append(title, status, purpose, date, requestId);
        requestsList.appendChild(item);
    });
}

// ========================================
// CHECK EXISTING LOGIN SESSION
// ========================================

async function checkSession() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error(error.message);
        showLogin();
        return;
    }

    if (data.session) {
        currentUser = data.session.user;
        await displayDashboard();
    } else {
        showLogin();
    }
}

// Listen for authentication changes
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
        currentUser = null;
        showLogin();
    }
});

// Start the application
checkSession();