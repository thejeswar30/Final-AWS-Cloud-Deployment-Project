const API_URL = "PASTE_YOUR_API_GATEWAY_URL_HERE";

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const priorityInput = document.getElementById("priorityInput");
const taskList = document.getElementById("taskList");
const addButton = document.getElementById("addButton");
const connectionStatus = document.getElementById("connectionStatus");
const toast = document.getElementById("toast");

let tasks = [];
let currentFilter = "all";

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

function setConnectionStatus(message, state) {
    connectionStatus.textContent = message;
    connectionStatus.className = "cloud-status " + state;
}

function checkApiConfiguration() {
    if (
        !API_URL.startsWith("https://") ||
        API_URL.includes("PASTE_YOUR")
    ) {
        setConnectionStatus("● API Not Configured", "error");
        taskList.innerHTML =
            '<div class="empty-state">Add your API Gateway URL in script.js to connect the AWS backend.</div>';
        return false;
    }

    return true;
}

async function apiRequest(path = "", options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

async function loadTasks() {
    if (!checkApiConfiguration()) return;

    setConnectionStatus("● Connecting", "");

    try {
        const data = await apiRequest("/tasks");
        tasks = data.tasks || [];
        setConnectionStatus("● AWS Connected", "connected");
        renderTasks();
    } catch (error) {
        setConnectionStatus("● Connection Failed", "error");
        taskList.innerHTML =
            '<div class="empty-state">Unable to load tasks. Check your AWS API configuration.</div>';
        showToast(error.message);
    }
}

function updateStats() {
    const completed = tasks.filter(task => task.completed).length;

    document.getElementById("totalTasks").textContent = tasks.length;
    document.getElementById("completedTasks").textContent = completed;
    document.getElementById("pendingTasks").textContent =
        tasks.length - completed;
}

function renderTasks() {
    updateStats();

    const filteredTasks = tasks.filter(task => {
        if (currentFilter === "completed") return task.completed;
        if (currentFilter === "pending") return !task.completed;
        return true;
    });

    taskList.innerHTML = "";

    if (filteredTasks.length === 0) {
        taskList.innerHTML =
            '<div class="empty-state">No tasks found. Add a new task to get started.</div>';
        return;
    }

    filteredTasks.forEach(task => {
        const item = document.createElement("div");
        item.className = "task-item";

        const info = document.createElement("div");
        info.className = "task-info";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(task.completed);

        checkbox.addEventListener("change", () => {
            updateTask(task.id, checkbox.checked);
        });

        const details = document.createElement("div");

        const title = document.createElement("div");
        title.className = "task-title";

        if (task.completed) {
            title.classList.add("completed");
        }

        title.textContent = task.title;

        const priority = document.createElement("span");
        priority.className = `task-priority priority-${task.priority}`;
        priority.textContent = `${task.priority} Priority`;

        details.append(title, priority);
        info.append(checkbox, details);

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteTask(task.id);
        });

        item.append(info, deleteButton);
        taskList.appendChild(item);
    });
}

taskForm.addEventListener("submit", async event => {
    event.preventDefault();

    const title = taskInput.value.trim();

    if (!title) {
        showToast("Please enter a task.");
        return;
    }

    if (!checkApiConfiguration()) return;

    addButton.disabled = true;
    addButton.textContent = "Adding...";

    try {
        await apiRequest("/tasks", {
            method: "POST",
            body: JSON.stringify({
                title,
                priority: priorityInput.value
            })
        });

        taskInput.value = "";
        showToast("Task added successfully.");
        await loadTasks();
    } catch (error) {
        showToast(error.message);
    } finally {
        addButton.disabled = false;
        addButton.textContent = "Add Task +";
    }
});

async function updateTask(id, completed) {
    try {
        await apiRequest(`/tasks/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: JSON.stringify({ completed })
        });

        showToast("Task updated.");
        await loadTasks();
    } catch (error) {
        showToast(error.message);
        await loadTasks();
    }
}

async function deleteTask(id) {
    if (!confirm("Are you sure you want to delete this task?")) {
        return;
    }

    try {
        await apiRequest(`/tasks/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        showToast("Task deleted.");
        await loadTasks();
    } catch (error) {
        showToast(error.message);
    }
}

document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".filter").forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");
        currentFilter = button.dataset.filter;
        renderTasks();
    });
});

loadTasks();