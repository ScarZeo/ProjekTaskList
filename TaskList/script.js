/**
 * script.js — Task List
 *
 * Handles all application logic:
 *  - State management (tasks array)
 *  - CRUD operations: Create, Read, Update, Delete
 *  - Toggle task status (Active ↔ Completed)
 *  - Filter: All | Active | Completed
 *  - Persistence via localStorage
 *  - DOM rendering
 *  - Modal (Edit) flow
 */

"use strict";

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS & STATE
───────────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = "tasklist_tasks";

/**
 * @typedef {Object} Task
 * @property {string}  id        - Unique identifier (timestamp-based)
 * @property {string}  text      - Task description
 * @property {boolean} completed - Whether the task is done
 */

/** @type {Task[]} */
let tasks = loadFromStorage();

/** Currently active filter: "all" | "active" | "completed" */
let currentFilter = "all";

/** The task id being edited (null when modal is closed) */
let editingTaskId = null;

/* ─────────────────────────────────────────────────────────────────────────────
   DOM REFERENCES
───────────────────────────────────────────────────────────────────────────── */

const taskForm          = document.getElementById("task-form");
const taskInput         = document.getElementById("task-input");
const inputError        = document.getElementById("input-error");
const addBtn            = document.getElementById("add-btn");

const taskList          = document.getElementById("task-list");
const emptyState        = document.getElementById("empty-state");
const countAll          = document.getElementById("count-all");
const countActive       = document.getElementById("count-active");
const countCompleted    = document.getElementById("count-completed");
const activeCount       = document.getElementById("active-count");
const listFooter        = document.getElementById("list-footer");
const clearCompletedBtn = document.getElementById("clear-completed-btn");

const filterTabs        = document.querySelectorAll(".filter-tab");

const modalOverlay      = document.getElementById("modal-overlay");
const editInput         = document.getElementById("edit-input");
const editError         = document.getElementById("edit-error");
const modalCancel       = document.getElementById("modal-cancel");
const modalSave         = document.getElementById("modal-save");

/* ─────────────────────────────────────────────────────────────────────────────
   STORAGE HELPERS
───────────────────────────────────────────────────────────────────────────── */

/** Load tasks array from localStorage. Returns [] on first run or parse error. */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Persist the current tasks array to localStorage. */
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/* ─────────────────────────────────────────────────────────────────────────────
   CRUD OPERATIONS
───────────────────────────────────────────────────────────────────────────── */

/**
 * CREATE — Add a new task to the beginning of the list.
 * @param {string} text - Task description (already trimmed & validated).
 */
function createTask(text) {
  /** @type {Task} */
  const newTask = {
    id: `task-${Date.now()}`,
    text,
    completed: false,
  };

  tasks.unshift(newTask); // newest first
  saveToStorage();
  render();
}

/**
 * UPDATE — Replace the text of an existing task.
 * @param {string} id   - Task id to update.
 * @param {string} text - New text (already trimmed & validated).
 */
function updateTask(id, text) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  task.text = text;
  saveToStorage();
  render();
}

/**
 * DELETE — Remove a task by id.
 * @param {string} id - Task id to remove.
 */
function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveToStorage();
  render();
}

/**
 * TOGGLE — Flip the completed status of a task.
 * @param {string} id - Task id to toggle.
 */
function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveToStorage();
  render();
}

/**
 * CLEAR COMPLETED — Remove all tasks that are marked completed.
 */
function clearCompleted() {
  tasks = tasks.filter((t) => !t.completed);
  saveToStorage();
  render();
}

/* ─────────────────────────────────────────────────────────────────────────────
   FILTERING
───────────────────────────────────────────────────────────────────────────── */

/**
 * Return the subset of tasks that match the current filter.
 * @returns {Task[]}
 */
function getFilteredTasks() {
  switch (currentFilter) {
    case "active":
      return tasks.filter((t) => !t.completed);
    case "completed":
      return tasks.filter((t) => t.completed);
    default:
      return tasks;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   RENDERING
───────────────────────────────────────────────────────────────────────────── */

/**
 * Main render function — called after every state change.
 * Re-renders the task list and updates all counters / UI states.
 */
function render() {
  const filtered        = getFilteredTasks();
  const totalActive     = tasks.filter((t) => !t.completed).length;
  const totalCompleted  = tasks.filter((t) => t.completed).length;

  // ── Update filter tab aria attributes ────────────────────────────────────
  filterTabs.forEach((tab) => {
    const isActive = tab.dataset.filter === currentFilter;
    tab.classList.toggle("active-tab", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  // ── Tab counts ────────────────────────────────────────────────────────────
  countAll.textContent       = `(${tasks.length})`;
  countActive.textContent    = `(${totalActive})`;
  countCompleted.textContent = `(${totalCompleted})`;

  // ── Footer visibility ─────────────────────────────────────────────────────
  if (tasks.length > 0) {
    listFooter.classList.remove("hidden");
    listFooter.classList.add("flex");
    activeCount.textContent = `${totalActive} ${totalActive === 1 ? "item" : "items"} left`;

    // Disable "Clear completed" when nothing to clear
    clearCompletedBtn.disabled = totalCompleted === 0;
    clearCompletedBtn.classList.toggle("opacity-30", totalCompleted === 0);
    clearCompletedBtn.classList.toggle("cursor-not-allowed", totalCompleted === 0);
  } else {
    listFooter.classList.add("hidden");
    listFooter.classList.remove("flex");
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    emptyState.classList.add("flex");
    taskList.innerHTML = "";
    return;
  }

  emptyState.classList.add("hidden");
  emptyState.classList.remove("flex");

  // ── Build task item HTML ───────────────────────────────────────────────────
  taskList.innerHTML = filtered.map((task) => buildTaskItemHTML(task)).join("");
}

/**
 * Build the HTML string for a single task list item.
 * @param {Task} task
 * @returns {string}
 */
function buildTaskItemHTML(task) {
  // Escape text to prevent XSS
  const safeText = escapeHTML(task.text);

  return `
    <li
      id="${task.id}"
      class="task-item flex items-center gap-3 px-5 py-4 group transition-colors hover:bg-gray-50
             ${task.completed ? "completed" : ""}"
      role="listitem"
    >
      <!-- Custom checkbox (toggle completed) -->
      <button
        class="custom-checkbox flex-shrink-0"
        data-action="toggle"
        data-id="${task.id}"
        aria-label="${task.completed ? "Mark as active" : "Mark as completed"}"
        title="${task.completed ? "Mark as active" : "Mark as completed"}"
      ></button>

      <!-- Task text -->
      <span class="task-text flex-1 text-sm leading-snug break-words min-w-0">
        ${safeText}
      </span>

      <!-- Status badge -->
      <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0
                   ${task.completed
                     ? "bg-gray-100 text-gray-400"
                     : "bg-primary-50 text-primary-500"}">
        ${task.completed ? "Done" : "Active"}
      </span>

      <!-- Action buttons (edit & delete) -->
      <div class="task-actions flex-shrink-0" aria-label="Task actions">
        <!-- Edit button -->
        <button
          data-action="edit"
          data-id="${task.id}"
          class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400
                 hover:text-primary-500 hover:bg-primary-50 transition-colors cursor-pointer"
          aria-label="Edit task"
          title="Edit task"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5"
               viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4.5 1.5 1.5-4.5L16.862 3.487z" />
          </svg>
        </button>

        <!-- Delete button -->
        <button
          data-action="delete"
          data-id="${task.id}"
          class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400
                 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          aria-label="Delete task"
          title="Delete task"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5"
               viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6
                     M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>
    </li>
  `;
}

/* ─────────────────────────────────────────────────────────────────────────────
   VALIDATION HELPERS
───────────────────────────────────────────────────────────────────────────── */

/**
 * Validate a task text string.
 * @param {string} text
 * @returns {{ valid: boolean, message: string }}
 */
function validateText(text) {
  if (!text) return { valid: false, message: "Task cannot be empty." };
  if (text.length > 120) return { valid: false, message: "Task must be under 120 characters." };
  return { valid: true, message: "" };
}

/** Escape HTML special chars to prevent XSS in innerHTML. */
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ─────────────────────────────────────────────────────────────────────────────
   MODAL (EDIT)
───────────────────────────────────────────────────────────────────────────── */

/**
 * Open the edit modal pre-filled with the task's current text.
 * @param {string} id - Task id to edit.
 */
function openEditModal(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  editingTaskId    = id;
  editInput.value  = task.text;
  editError.classList.add("hidden");

  modalOverlay.classList.remove("hidden");
  editInput.focus();
  editInput.select();
}

/** Close the edit modal and reset editing state. */
function closeEditModal() {
  editingTaskId = null;
  modalOverlay.classList.add("hidden");
  editInput.value = "";
  editError.classList.add("hidden");
}

/** Save changes from the edit modal. */
function saveEdit() {
  const text = editInput.value.trim();
  const { valid, message } = validateText(text);

  if (!valid) {
    editError.textContent = message;
    editError.classList.remove("hidden");
    editInput.focus();
    return;
  }

  updateTask(editingTaskId, text);
  closeEditModal();
}

/* ─────────────────────────────────────────────────────────────────────────────
   EVENT LISTENERS
───────────────────────────────────────────────────────────────────────────── */

// ── Add task form submit ────────────────────────────────────────────────────
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const text = taskInput.value.trim();
  const { valid, message } = validateText(text);

  if (!valid) {
    inputError.textContent = message;
    inputError.classList.remove("hidden");
    taskInput.focus();
    return;
  }

  // Hide any previous error
  inputError.classList.add("hidden");

  createTask(text);
  taskInput.value = "";
  taskInput.focus();
});

// ── Clear input error on typing ─────────────────────────────────────────────
taskInput.addEventListener("input", () => {
  if (!inputError.classList.contains("hidden")) {
    inputError.classList.add("hidden");
  }
});

// ── Task list: event delegation for toggle / edit / delete ──────────────────
taskList.addEventListener("click", (e) => {
  // Walk up the DOM to find the nearest button with data-action
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const { action, id } = btn.dataset;

  switch (action) {
    case "toggle":
      toggleTask(id);
      break;
    case "edit":
      openEditModal(id);
      break;
    case "delete":
      deleteTask(id);
      break;
  }
});

// ── Filter tabs ─────────────────────────────────────────────────────────────
filterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    currentFilter = tab.dataset.filter;
    render();
  });
});

// ── Clear completed button ──────────────────────────────────────────────────
clearCompletedBtn.addEventListener("click", () => {
  if (!clearCompletedBtn.disabled) {
    clearCompleted();
  }
});

// ── Modal: cancel ───────────────────────────────────────────────────────────
modalCancel.addEventListener("click", closeEditModal);

// ── Modal: save (button click) ───────────────────────────────────────────────
modalSave.addEventListener("click", saveEdit);

// ── Modal: save on Enter key ─────────────────────────────────────────────────
editInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveEdit();
  if (e.key === "Escape") closeEditModal();
});

// ── Modal: close on overlay backdrop click ───────────────────────────────────
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeEditModal();
});

// ── Keyboard: close modal on Escape globally ─────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalOverlay.classList.contains("hidden")) {
    closeEditModal();
  }
});

/* ─────────────────────────────────────────────────────────────────────────────
   INITIALISE
───────────────────────────────────────────────────────────────────────────── */

// Initial render on page load
render();
