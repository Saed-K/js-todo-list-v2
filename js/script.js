// Global Variables
let tasks = [];
let currentFilter = "all"; // "all", "active", "completed", "archived"
let searchQuery = "";
let bulkMode = false;
let draggedIndex = null;
let lastDeletedTasks = [];
let calendarView = false; // Toggle between list and calendar view
let draggedTaskIndex = null;
let placeholder = document.createElement("li");
placeholder.className = "task-placeholder";

// On DOMContentLoaded, initialize tasks and event listeners
window.addEventListener("DOMContentLoaded", () => {
  tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  tasks.forEach((task) => {
    if (!task.subtasks) task.subtasks = [];
    if (!task.history) task.history = [];
  });
  renderTasks();
  setupAnalytics();
  setupFilterButtons();
  setupSearch();
  setupModeToggle();
  setupAdditionalControls();
  setupBulkModeToggle();
  setupHelpModal();
  setupCommentsModal();
  updateTagFilterOptions();
  setupSortAndFilterOptions();
});
function setupSortAndFilterOptions() {
  document.getElementById("sortSelect").addEventListener("change", renderTasks);
  document
    .getElementById("priorityFilter")
    .addEventListener("change", renderTasks);
  document.getElementById("tagFilter").addEventListener("change", (e) => {
    const tagFilter = e.target;
    tagFilter.setAttribute("data-selected", tagFilter.value);
    renderTasks();
  });
}

function setupFilterButtons() {
  const filterButtons = document.querySelectorAll(".filter-btn");
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentFilter = button.id.replace("filter", "").toLowerCase();
      renderTasks();
    });
  });
}
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderTasks();
  });
}
function setupAdditionalControls() {
  document.getElementById("markAllCompleted").addEventListener("click", () => {
    tasks.forEach((task) => {
      task.completed = true;
      task.updatedAt = new Date().toISOString();
    });
    saveTasks();
    renderTasks();
  });

  document.getElementById("undoButton").addEventListener("click", () => {
    if (lastDeletedTasks.length > 0) {
      tasks = tasks.concat(lastDeletedTasks);
      lastDeletedTasks = [];
      saveTasks();
      renderTasks();
    }
  });

  document.getElementById("clearCompleted").addEventListener("click", () => {
    tasks = tasks.filter((task) => !task.completed);
    saveTasks();
    renderTasks();
  });
}
// Save tasks and update analytics
function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
  updateProgressBar();
  updateAnalytics();
}

// Add a new task (with tags and history)
document.getElementById("addTaskButton").addEventListener("click", () => {
  const taskText = document.getElementById("taskInput").value.trim();
  const dueDate = document.getElementById("dueDateInput").value;
  const priority = document.getElementById("prioritySelect").value;
  const category = document.getElementById("categoryInput")
    ? document.getElementById("categoryInput").value.trim()
    : "";
  const tagsInput = document.getElementById("tagsInput")
    ? document.getElementById("tagsInput").value.trim()
    : "";
  const recurring = document.getElementById("recurringSelect")
    ? document.getElementById("recurringSelect").value
    : "None";
  let tags = [];
  if (tagsInput) {
    tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");
  }
  if (taskText !== "") {
    const now = new Date().toISOString();
    const task = {
      id: Date.now(),
      text: taskText,
      completed: false,
      dueDate: dueDate,
      priority: priority,
      category: category,
      tags: tags,
      recurring: recurring,
      createdAt: now,
      updatedAt: now,
      history: [now],
      selected: false,
      pinned: false,
      archived: false,
      note: { text: "", lastUpdated: "" },
      comments: [],
      subtasks: [],
    };
    tasks.push(task);
    saveTasks();
    renderTasks();
    document.getElementById("taskInput").value = "";
    document.getElementById("dueDateInput").value = "";
    document.getElementById("prioritySelect").value = "medium";
    if (document.getElementById("categoryInput"))
      document.getElementById("categoryInput").value = "";
    if (document.getElementById("tagsInput"))
      document.getElementById("tagsInput").value = "";
    if (document.getElementById("recurringSelect"))
      document.getElementById("recurringSelect").value = "None";
  }
});

// Render tasks (list view or calendar view)
function renderTasks() {
  if (calendarView) {
    renderCalendarView();
  } else {
    renderTaskList();
  }
}

function renderTaskList() {
  document.getElementById("calendarView").style.display = "none";
  document.getElementById("taskList").style.display = "block";

  const taskList = document.getElementById("taskList");
  taskList.innerHTML = "";

  let filteredTasks = tasks.filter((t) => !t.archived);
  if (currentFilter === "active")
    filteredTasks = filteredTasks.filter((t) => !t.completed);
  else if (currentFilter === "completed")
    filteredTasks = filteredTasks.filter((t) => t.completed);
  else if (currentFilter === "archived")
    filteredTasks = tasks.filter((t) => t.archived);

  const priorityFilter = document.getElementById("priorityFilter").value;
  if (priorityFilter !== "all")
    filteredTasks = filteredTasks.filter((t) => t.priority === priorityFilter);

  const tagFilter = document.getElementById("tagFilter").value;
  if (tagFilter !== "all") {
    filteredTasks = filteredTasks.filter(
      (t) => t.tags && t.tags.includes(tagFilter)
    );
  }

  if (searchQuery !== "")
    filteredTasks = filteredTasks.filter((t) =>
      t.text.toLowerCase().includes(searchQuery)
    );

  const sortValue = document.getElementById("sortSelect").value;
  if (sortValue === "dueDate") {
    filteredTasks.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  } else if (sortValue === "priority") {
    const order = { high: 1, medium: 2, low: 3 };
    filteredTasks.sort((a, b) => order[a.priority] - order[b.priority]);
  } else if (sortValue === "category") {
    filteredTasks.sort((a, b) => a.category.localeCompare(b.category));
  } else if (sortValue === "lastUpdated") {
    filteredTasks.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } else if (sortValue === "createdAt") {
    filteredTasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }
  filteredTasks.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  filteredTasks.forEach((task, index) => {
    const li = document.createElement("li");
    li.className = `task-item priority-${task.priority}`;
    li.setAttribute("data-index", index);
    li.setAttribute("draggable", true);
    li.addEventListener("dragstart", handleDragStart);
    li.addEventListener("dragover", handleDragOver);
    li.addEventListener("drop", handleDrop);
    li.addEventListener("dragend", handleDragEnd);

    const createdDate = task.createdAt
      ? new Date(task.createdAt).toLocaleString()
      : "";
    let overdueText = "";
    if (task.dueDate && new Date(task.dueDate) < new Date() && !task.completed)
      overdueText = ' <span class="overdue"> - Overdue</span>';
    let countdownText = "";
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      const now = new Date();
      const diff = due - now;
      if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
        const hrs = Math.floor(diff / (60 * 60 * 1000));
        const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
        countdownText = ` <span class="countdown">(${hrs}h ${mins}m left)</span>`;
      }
    }

    const checkboxHtml = bulkMode
      ? `<input type="checkbox" class="taskCheckbox" ${
          task.selected ? "checked" : ""
        } onchange="toggleTaskSelection(${task.id}, this.checked)">`
      : `<input type="checkbox" class="taskCheckbox" ${
          task.completed ? "checked" : ""
        } onchange="toggleTaskCompletion(${task.id}, this.checked)">`;

    let tagsHtml = "";
    if (task.tags && task.tags.length > 0) {
      tagsHtml = task.tags
        .map((tag) => `<span class="tag-badge">${tag}</span>`)
        .join("");
    }

    // Subtask progress
    let subtaskProgress = "";
    if (task.subtasks && task.subtasks.length > 0) {
      const completedSub = task.subtasks.filter((s) => s.completed).length;
      const percent = Math.round((completedSub / task.subtasks.length) * 100);
      subtaskProgress = `<div class="subtask-progress">Subtasks: ${percent}% complete</div>`;
      if (completedSub > 0) {
        subtaskProgress += `<button class="clear-subtasks" onclick="clearCompletedSubtasks(${task.id})">Clear Completed Subtasks</button>`;
      }
    }

    li.innerHTML = `
      <div class="task-left">
        <button class="pin" onclick="togglePin(${task.id})">${
      task.pinned ? "★" : "☆"
    }</button>
        ${checkboxHtml}
      </div>
      <div class="task-right">
        <div class="task-content">
          <span class="task-text" data-id="${task.id}">${task.text}</span>
          <div class="task-details">
            ${task.dueDate ? "Due: " + task.dueDate : ""}
            ${task.priority ? " | Priority: " + capitalize(task.priority) : ""}
            ${task.category ? " | Category: " + task.category : ""}
            ${tagsHtml}
            ${
              task.recurring && task.recurring !== "None"
                ? " | Recurring: " + task.recurring
                : ""
            }
            ${createdDate ? " | Created: " + createdDate : ""}
            ${overdueText}
            ${countdownText}
          </div>
          ${subtaskProgress}
        </div>
        <div class="action-row">
          <button class="edit" onclick="editTask(${task.id})">Edit</button>
          <button class="delete" onclick="deleteTask(${
            task.id
          })">Delete</button>
          <button class="archive" onclick="toggleArchive(${task.id})">${
      task.archived ? "Unarchive" : "Archive"
    }</button>
          <button class="comments" onclick="openCommentsModal(${
            task.id
          })">Comments</button>
          <button class="history" onclick="openHistoryModal(${
            task.id
          })">History</button>
          <button class="subtask" onclick="addSubtask(${
            task.id
          })">Add Subtask</button>
        </div>
        <div class="subtasks">
          ${(task.subtasks || [])
            .map(
              (sub, i) => `
            <div class="subtask">
              <input type="checkbox" ${
                sub.completed ? "checked" : ""
              } onchange="toggleSubtask(${task.id}, ${i}, this.checked)" />
              <span ${sub.completed ? 'class="completed"' : ""}>${
                sub.text
              }</span>
              <button onclick="deleteSubtask(${task.id}, ${i})">X</button>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
    taskList.appendChild(li);

    const taskTextSpan = li.querySelector(".task-text");
    taskTextSpan.addEventListener("dblclick", () =>
      enableInlineEditing(taskTextSpan, task.id)
    );
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  document.getElementById(
    "taskCounter"
  ).innerText = `${completedCount} of ${tasks.length} tasks completed`;
  updateProgressBar();
  updateTagFilterOptions();
}

// Render Calendar View
function renderCalendarView() {
  document.getElementById("taskList").style.display = "none";
  const calendarView = document.getElementById("calendarView");
  calendarView.style.display = "block";
  calendarView.innerHTML = "";

  const tasksWithDue = tasks.filter((t) => t.dueDate && !t.archived);
  const groups = {};
  tasksWithDue.forEach((task) => {
    if (!groups[task.dueDate]) {
      groups[task.dueDate] = [];
    }
    groups[task.dueDate].push(task);
  });

  Object.keys(groups)
    .sort((a, b) => new Date(a) - new Date(b))
    .forEach((date) => {
      let dayDiv = document.createElement("div");
      dayDiv.className = "calendar-day";
      dayDiv.innerHTML = `<h3>${date}</h3>`;
      groups[date].forEach((task) => {
        let taskDiv = document.createElement("div");
        taskDiv.className = "calendar-task";
        taskDiv.innerHTML = `
        <div class="task-text">${task.text}</div>
        <div class="task-details">
          ${task.priority ? "Priority: " + capitalize(task.priority) : ""}
          ${task.category ? " | Category: " + task.category : ""}
        </div>
      `;
        taskDiv.addEventListener("click", () => openCommentsModal(task.id));
        dayDiv.appendChild(taskDiv);
      });
      calendarView.appendChild(dayDiv);
    });
}

// Update Tag Filter Options
function updateTagFilterOptions() {
  const tagFilter = document.getElementById("tagFilter");
  if (!tagFilter) return;
  let tags = new Set();
  tasks.forEach((task) => {
    if (task.tags && task.tags.length > 0) {
      task.tags.forEach((tag) => tags.add(tag));
    }
  });
  let options = `<option value="all">All Tags</option>`;
  tags.forEach((tag) => {
    options += `<option value="${tag}">${tag}</option>`;
  });
  tagFilter.innerHTML = options;

  // Ensure the selected value is retained
  const selectedTag = tagFilter.getAttribute("data-selected") || "all";
  tagFilter.value = selectedTag;
}
window.addEventListener("DOMContentLoaded", updateTagFilterOptions);

// Print Tasks
document.getElementById("printTasks").addEventListener("click", () => {
  window.print();
});

// Helper: capitalize
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Toggle task completion
function toggleTaskCompletion(id, isCompleted) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = isCompleted;
    task.updatedAt = new Date().toISOString();
    addHistory(
      task,
      "Task marked " + (isCompleted ? "completed" : "incomplete")
    );
    saveTasks();
    renderTasks();
    if (isCompleted && task.recurring !== "None") createRecurringTask(task);
  }
}
function createRecurringTask(task) {
  let newDue;
  const currentDue = task.dueDate ? new Date(task.dueDate) : new Date();
  if (task.recurring === "Daily")
    newDue = new Date(currentDue.getTime() + 24 * 60 * 60 * 1000);
  else if (task.recurring === "Weekly")
    newDue = new Date(currentDue.getTime() + 7 * 24 * 60 * 60 * 1000);
  else if (task.recurring === "Monthly")
    newDue = new Date(currentDue.getTime() + 30 * 24 * 60 * 60 * 1000);
  else newDue = currentDue;
  const newTask = { ...task };
  newTask.id = Date.now();
  newTask.completed = false;
  newTask.createdAt = new Date().toISOString();
  newTask.updatedAt = new Date().toISOString();
  newTask.dueDate = newDue.toISOString().split("T")[0];
  newTask.archived = false;
  newTask.subtasks = [];
  newTask.history = [newTask.createdAt];
  tasks.push(newTask);
  saveTasks();
  renderTasks();
}

// Toggle Pin/Unpin
function togglePin(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.pinned = !task.pinned;
    task.updatedAt = new Date().toISOString();
    addHistory(task, "Task " + (task.pinned ? "pinned" : "unpinned"));
    saveTasks();
    renderTasks();
  }
}

// Delete task
function deleteTask(id) {
  const deleted = tasks.filter((t) => t.id === id);
  lastDeletedTasks = deleted;
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
}

// Archive/Unarchive task
function toggleArchive(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.archived = !task.archived;
    task.updatedAt = new Date().toISOString();
    addHistory(task, "Task " + (task.archived ? "archived" : "unarchived"));
    saveTasks();
    renderTasks();
  }
}

// Edit task via prompt
function editTask(id) {
  const task = tasks.find((t) => t.id === id);
  const newText = prompt("Edit your task:", task.text);
  if (newText && newText.trim() !== "") {
    task.text = newText.trim();
    task.updatedAt = new Date().toISOString();
    addHistory(task, "Task text edited");
    saveTasks();
    renderTasks();
  }
}

// Inline editing via contentEditable
function enableInlineEditing(span, taskId) {
  span.contentEditable = true;
  span.focus();
  span.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      span.blur();
    }
  });
  span.addEventListener(
    "blur",
    function () {
      span.contentEditable = false;
      const newText = span.innerText.trim();
      if (newText) {
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          task.text = newText;
          task.updatedAt = new Date().toISOString();
          addHistory(task, "Task text edited");
          saveTasks();
        }
      } else {
        const task = tasks.find((t) => t.id === taskId);
        span.innerText = task ? task.text : "";
      }
    },
    { once: true }
  );
}

// Subtasks functions
function addSubtask(id) {
  const subText = prompt("Enter subtask:");
  if (subText && subText.trim() !== "") {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.subtasks = task.subtasks || [];
      task.subtasks.push({ text: subText.trim(), completed: false });
      task.updatedAt = new Date().toISOString();
      addHistory(task, "Subtask added");
      saveTasks();
      renderTasks();
    }
  }
}
function toggleSubtask(taskId, subIndex, isCompleted) {
  const task = tasks.find((t) => t.id === taskId);
  if (task && task.subtasks && task.subtasks[subIndex]) {
    task.subtasks[subIndex].completed = isCompleted;
    task.updatedAt = new Date().toISOString();
    addHistory(
      task,
      "Subtask " + (isCompleted ? "completed" : "marked incomplete")
    );
    saveTasks();
    renderTasks();
  }
}
function deleteSubtask(taskId, subIndex) {
  const task = tasks.find((t) => t.id === taskId);
  if (task && task.subtasks) {
    task.subtasks.splice(subIndex, 1);
    task.updatedAt = new Date().toISOString();
    addHistory(task, "Subtask deleted");
    saveTasks();
    renderTasks();
  }
}
function clearCompletedSubtasks(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (task && task.subtasks) {
    task.subtasks = task.subtasks.filter((s) => !s.completed);
    task.updatedAt = new Date().toISOString();
    addHistory(task, "Cleared completed subtasks");
    saveTasks();
    renderTasks();
  }
}

// Render Calendar View
function renderCalendarView() {
  document.getElementById("taskList").style.display = "none";
  const calendarView = document.getElementById("calendarView");
  calendarView.style.display = "block";
  calendarView.innerHTML = "";

  const tasksWithDue = tasks.filter((t) => t.dueDate && !t.archived);
  const groups = {};
  tasksWithDue.forEach((task) => {
    if (!groups[task.dueDate]) {
      groups[task.dueDate] = [];
    }
    groups[task.dueDate].push(task);
  });

  Object.keys(groups)
    .sort((a, b) => new Date(a) - new Date(b))
    .forEach((date) => {
      let dayDiv = document.createElement("div");
      dayDiv.className = "calendar-day";
      dayDiv.innerHTML = `<h3>${date}</h3>`;
      groups[date].forEach((task) => {
        let taskDiv = document.createElement("div");
        taskDiv.className = "calendar-task";
        taskDiv.innerHTML = `
        <div class="task-text">${task.text}</div>
        <div class="task-details">
          ${task.priority ? "Priority: " + capitalize(task.priority) : ""}
          ${task.category ? " | Category: " + task.category : ""}
        </div>
      `;
        taskDiv.addEventListener("click", () => openCommentsModal(task.id));
        dayDiv.appendChild(taskDiv);
      });
      calendarView.appendChild(dayDiv);
    });
}

// Print Tasks
document.getElementById("printTasks").addEventListener("click", () => {
  window.print();
});

// History functions
function addHistory(task, action) {
  const now = new Date().toLocaleString();
  if (!task.history) {
    task.history = [];
  }
  task.history.push(now + " - " + action);
}
function openHistoryModal(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const historyModal = document.getElementById("historyModal");
  const historyView = document.getElementById("historyView");
  if (task.history && task.history.length > 0) {
    historyView.innerHTML = task.history
      .map((entry) => `<div class="history-entry">${entry}</div>`)
      .join("");
  } else {
    historyView.innerHTML = "<p>No history available.</p>";
  }
  historyModal.setAttribute("data-task-id", id);
  historyModal.style.display = "block";
}
document.getElementById("clearHistoryButton")?.addEventListener("click", () => {
  const id = parseInt(
    document.getElementById("historyModal").getAttribute("data-task-id")
  );
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.history = [];
    task.updatedAt = new Date().toISOString();
    saveTasks();
    renderTasks();
    openHistoryModal(id);
  }
});

// Setup Bulk Mode Toggle
function setupBulkModeToggle() {
  document.getElementById("bulkModeToggle").addEventListener("click", () => {
    bulkMode = true;
    document.getElementById("normalControls").style.display = "none";
    document.getElementById("bulkControls").style.display = "flex";
    renderTasks();
  });
  document
    .getElementById("bulkModeToggleExit")
    .addEventListener("click", () => {
      bulkMode = false;
      tasks.forEach((t) => (t.selected = false));
      saveTasks();
      document.getElementById("bulkControls").style.display = "none";
      document.getElementById("normalControls").style.display = "flex";
      renderTasks();
    });
  document
    .getElementById("selectAllCheckbox")
    .addEventListener("change", (e) => {
      const checked = e.target.checked;
      tasks.forEach((t) => (t.selected = checked));
      saveTasks();
      renderTasks();
    });
  document.getElementById("bulkDelete").addEventListener("click", () => {
    lastDeletedTasks = tasks.filter((t) => t.selected);
    tasks = tasks.filter((t) => !t.selected);
    saveTasks();
    renderTasks();
  });
  document.getElementById("clearAll").addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all tasks?")) {
      lastDeletedTasks = tasks;
      tasks = [];
      saveTasks();
      renderTasks();
    }
  });
}

// Drag and Drop Handlers
function handleDragStart(e) {
  draggedIndex = parseInt(e.currentTarget.getAttribute("data-index"));
  e.currentTarget.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
}
function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  const target = e.currentTarget;
  const targetIndex = parseInt(target.getAttribute("data-index"));
  const taskList = document.getElementById("taskList");
  if (targetIndex !== draggedIndex) {
    const rect = target.getBoundingClientRect();
    const nextSibling = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
    taskList.insertBefore(
      placeholder,
      nextSibling ? target.nextSibling : target
    );
  }
}
function handleDrop(e) {
  e.stopPropagation();
  const targetIndex = parseInt(e.currentTarget.getAttribute("data-index"));
  if (draggedIndex !== null && draggedIndex !== targetIndex) {
    const draggedTask = tasks.splice(draggedIndex, 1)[0];
    const newIndex = [...taskList.children].indexOf(placeholder);
    tasks.splice(newIndex, 0, draggedTask);
    saveTasks();
    renderTasks();
  }
  return false;
}
function handleDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  placeholder.remove();
}
// Update Progress Bar
function updateProgressBar() {
  const progressBar = document.getElementById("progressBar");
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const perc = total ? (completed / total) * 100 : 0;
  progressBar.style.width = `${perc}%`;
}

// Setup Analytics Summary
function setupAnalytics() {
  updateAnalytics();
}
function updateAnalytics() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed
  ).length;
  const pinned = tasks.filter((t) => t.pinned).length;
  const archived = tasks.filter((t) => t.archived).length;
  document.getElementById(
    "analytics"
  ).innerHTML = `Total: ${total} | Completed: ${completed} | Pending: ${pending} | Overdue: ${overdue} | Pinned: ${pinned} | Archived: ${archived}`;
}

// Overdue Notifications
function notifyOverdue(task) {
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification("Task Overdue", { body: task.text });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted")
          new Notification("Task Overdue", { body: task.text });
      });
    }
  }
}
function checkOverdueNotifications() {
  tasks.forEach((task) => {
    if (task.dueDate && new Date(task.dueDate) < new Date() && !task.completed)
      notifyOverdue(task);
  });
}
setInterval(checkOverdueNotifications, 60000);

// Setup Help Modal
function setupHelpModal() {
  const helpModal = document.getElementById("helpModal");
  const helpButton = document.getElementById("helpButton");
  const closeHelpModal = document.getElementById("closeHelpModal");
  if (closeHelpModal) {
    helpButton.addEventListener("click", () => {
      helpModal.style.display = "block";
    });
    closeHelpModal.addEventListener("click", () => {
      helpModal.style.display = "none";
    });
    window.addEventListener("click", (e) => {
      if (e.target == helpModal) helpModal.style.display = "none";
    });
  }
}

// Setup Comments Modal
function setupCommentsModal() {
  const commentsModal = document.getElementById("commentsModal");
  const closeCommentsModal = document.getElementById("closeCommentsModal");
  if (closeCommentsModal) {
    closeCommentsModal.addEventListener("click", () => {
      commentsModal.style.display = "none";
    });
    window.addEventListener("click", (e) => {
      if (e.target == commentsModal) commentsModal.style.display = "none";
    });
  }
}
function openCommentsModal(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const commentsModal = document.getElementById("commentsModal");
  const commentsView = document.getElementById("commentsView");
  commentsView.innerHTML = (task.comments || [])
    .map(
      (c, index) => `
    <div class="comment-item" data-index="${index}">
      <div class="comment-text">${c.text}</div>
      <div class="comment-timestamp"><small>${c.timestamp}</small></div>
      <div class="comment-actions">
        <button class="edit" onclick="editComment(${id}, ${index})">Edit</button>
        <button class="delete" onclick="deleteComment(${id}, ${index})">Delete</button>
      </div>
    </div>
  `
    )
    .join("");
  commentsModal.setAttribute("data-task-id", id);
  commentsModal.style.display = "block";
}
function editComment(taskId, commentIndex) {
  const task = tasks.find((t) => t.id === taskId);
  if (task && task.comments && task.comments[commentIndex]) {
    const newCommentText = prompt(
      "Edit your comment:",
      task.comments[commentIndex].text
    );
    if (newCommentText && newCommentText.trim() !== "") {
      task.comments[commentIndex].text = newCommentText.trim();
      task.comments[commentIndex].timestamp = new Date().toLocaleString();
      task.updatedAt = new Date().toISOString();
      addHistory(task, "Comment edited");
      saveTasks();
      openCommentsModal(taskId);
    }
  }
}

function deleteComment(taskId, commentIndex) {
  const task = tasks.find((t) => t.id === taskId);
  if (task && task.comments) {
    task.comments.splice(commentIndex, 1);
    task.updatedAt = new Date().toISOString();
    addHistory(task, "Comment deleted");
    saveTasks();
    openCommentsModal(taskId);
  }
}
document.getElementById("addCommentButton")?.addEventListener("click", () => {
  const id = parseInt(
    document.getElementById("commentsModal").getAttribute("data-task-id")
  );
  const commentText = document.getElementById("commentInput").value.trim();
  if (commentText !== "") {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.comments = task.comments || [];
      task.comments.push({
        text: commentText,
        timestamp: new Date().toLocaleString(),
      });
      task.updatedAt = new Date().toISOString();
      addHistory(task, "Comment added");
      saveTasks();
      renderTasks();
    }
    document.getElementById("commentInput").value = "";
    openCommentsModal(id);
  }
});

// Toggle Calendar View and Print Tasks
document.getElementById("toggleCalendar").addEventListener("click", () => {
  calendarView = !calendarView;
  renderTasks();
});
document.getElementById("printTasks").addEventListener("click", () => {
  window.print();
});

// History Functions
function addHistory(task, action) {
  const now = new Date().toLocaleString();
  if (!task.history) {
    task.history = [];
  }
  task.history.push(now + " - " + action);
}
function openHistoryModal(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  const historyModal = document.getElementById("historyModal");
  const historyView = document.getElementById("historyView");
  if (task.history && task.history.length > 0) {
    historyView.innerHTML = task.history
      .map((entry) => `<div class="history-entry">${entry}</div>`)
      .join("");
  } else {
    historyView.innerHTML = "<p>No history available.</p>";
  }
  historyModal.setAttribute("data-task-id", id);
  historyModal.style.display = "block";
}
document.getElementById("clearHistoryButton")?.addEventListener("click", () => {
  const id = parseInt(
    document.getElementById("historyModal").getAttribute("data-task-id")
  );
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.history = [];
    task.updatedAt = new Date().toISOString();
    saveTasks();
    renderTasks();
    openHistoryModal(id);
  }
});

// Setup Help Modal
function setupHelpModal() {
  const helpModal = document.getElementById("helpModal");
  const helpButton = document.getElementById("helpButton");
  const closeHelpModal = document.getElementById("closeHelpModal");
  if (closeHelpModal) {
    helpButton.addEventListener("click", () => {
      helpModal.style.display = "block";
    });
    closeHelpModal.addEventListener("click", () => {
      helpModal.style.display = "none";
    });
    window.addEventListener("click", (e) => {
      if (e.target == helpModal) helpModal.style.display = "none";
    });
  }
}

// Setup Comments Modal (dark mode adjustments handled via CSS)
function setupCommentsModal() {
  const commentsModal = document.getElementById("commentsModal");
  const closeCommentsModal = document.getElementById("closeCommentsModal");
  if (closeCommentsModal) {
    closeCommentsModal.addEventListener("click", () => {
      commentsModal.style.display = "none";
    });
    window.addEventListener("click", (e) => {
      if (e.target == commentsModal) commentsModal.style.display = "none";
    });
  }
}

// Setup History Modal
document.getElementById("closeHistoryModal")?.addEventListener("click", () => {
  document.getElementById("historyModal").style.display = "none";
});

// Setup Dark/Light Mode Toggle (update modals accordingly)
function setupModeToggle() {
  const body = document.body;
  const containers = document.querySelectorAll(".container");
  const modals = document.querySelectorAll(".modal-content");
  const modeToggle = document.getElementById("modeToggle");
  const modeIcon = document.getElementById("modeIcon");

  // Load saved mode from localStorage
  const savedMode = localStorage.getItem("dark-mode");
  if (savedMode === "true") {
    body.classList.add("dark-mode");
    containers.forEach((container) => container.classList.add("dark-mode"));
    modals.forEach((modal) => modal.classList.add("dark-mode"));
    modeIcon.innerText = "🌞";
  }

  modeToggle.addEventListener("click", () => {
    body.classList.toggle("dark-mode");
    containers.forEach((container) => container.classList.toggle("dark-mode"));
    modals.forEach((modal) => modal.classList.toggle("dark-mode"));
    const isDarkMode = body.classList.contains("dark-mode");
    modeIcon.innerText = isDarkMode ? "🌞" : "🌙";
    localStorage.setItem("dark-mode", isDarkMode);
  });
}

// Fetch a random quote from a free API
async function fetchRandomQuote() {
  try {
    const response = await fetch(
      "https://api.quotable.io/random?tags=philosophy"
    );
    const data = await response.json();
    document.getElementById("quoteText").innerText = `"${data.content}"`;
    document.getElementById("quoteAuthor").innerText = `- ${data.author}`;
  } catch (error) {
    document.getElementById("quoteText").innerText =
      "Failed to fetch quote. Please try again.";
    document.getElementById("quoteAuthor").innerText = "";
  }
}
// Copy the current quote to the clipboard
function copyQuoteToClipboard() {
  const quoteText = document.getElementById("quoteText").innerText;
  const quoteAuthor = document.getElementById("quoteAuthor").innerText;
  const quote = `${quoteText} ${quoteAuthor}`;
  navigator.clipboard
    .writeText(quote)
    .then(() => {
      alert("Quote copied to clipboard!");
    })
    .catch((err) => {
      alert("Failed to copy quote. Please try again.");
    });
}
// Event listeners for the quote buttons
document
  .getElementById("newQuoteButton")
  .addEventListener("click", fetchRandomQuote);
document
  .getElementById("copyQuoteButton")
  .addEventListener("click", copyQuoteToClipboard);

// Fetch an initial quote on page load
window.addEventListener("DOMContentLoaded", fetchRandomQuote);

//

// Music Player Functionality
const musicPlayer = document.getElementById("musicPlayer");
const playPauseButton = document.getElementById("playPauseButton");
const volumeSlider = document.getElementById("volumeSlider");

playPauseButton.addEventListener("click", () => {
  if (musicPlayer.paused) {
    musicPlayer.play();
    playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
  } else {
    musicPlayer.pause();
    playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
  }
});

volumeSlider.addEventListener("input", (e) => {
  musicPlayer.volume = e.target.value;
});

document.documentElement.style.scrollBehavior = "smooth";
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 500);
  }, 3000);
}

// Example usage:
showToast("Task added successfully!");
