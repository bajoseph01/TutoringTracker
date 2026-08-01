const STORAGE_KEY = "tutoringTracker.v1";
const RATE = 200;

const defaultState = {
  students: [
    { id: "stu-liam", name: "Liam Botha", subject: "Maths" },
    { id: "stu-zoe", name: "Zoë Jacobs", subject: "Afrikaans" },
    { id: "stu-ama", name: "Ama Dlamini", subject: "Maths" }
  ],
  sessions: []
};

let state = loadState();
let visibleMonth = new Date();
visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const money = (value) => `R${Number(value).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
const isoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const niceDate = (dateString) => new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${dateString}T12:00:00`));
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const studentFor = (id) => state.students.find((student) => student.id === id);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.students) && Array.isArray(saved.sessions)) return saved;
  } catch (error) {
    console.warn("Could not load saved tutoring data", error);
  }
  return structuredClone(defaultState);
}

function persist(message) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (message) showToast(message);
}

function renderAll() {
  renderCalendar();
  renderStudents();
  renderPayments();
  refreshStudentOptions();
}

function renderCalendar() {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const first = new Date(year, month, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayOffset);
  const today = isoDate(new Date());
  const title = new Intl.DateTimeFormat("en-ZA", { month: "long" }).format(first);
  $("#monthTitle").innerHTML = `${title} <em>${year}</em>`;

  const monthlySessions = state.sessions.filter((session) => {
    const date = new Date(`${session.date}T12:00:00`);
    return date.getFullYear() === year && date.getMonth() === month;
  });
  const earned = monthlySessions.reduce((sum, session) => sum + Number(session.fee), 0);
  const outstanding = monthlySessions.filter((session) => session.payment === "unpaid").reduce((sum, session) => sum + Number(session.fee), 0);
  const hours = monthlySessions.reduce((sum, session) => sum + Number(session.duration), 0);
  $("#hoursTotal").textContent = hours % 1 === 0 ? hours : hours.toFixed(1);
  $("#earnedTotal").textContent = money(earned);
  $("#outstandingTotal").textContent = money(outstanding);

  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = isoDate(date);
    const sessions = state.sessions
      .filter((session) => session.date === dateKey)
      .sort((a, b) => a.time.localeCompare(b.time));
    const isOutside = date.getMonth() !== month;
    const isWeekend = index % 7 > 4;
    const shownSessions = sessions.slice(0, 3);
    cells.push(`
      <div class="day-cell${isOutside ? " outside" : ""}${isWeekend ? " weekend" : ""}${dateKey === today ? " today" : ""}" data-date="${dateKey}" role="button" tabindex="0" aria-label="${niceDate(dateKey)}. ${sessions.length} sessions">
        <span class="date-number">${date.getDate()}</span>
        <div class="session-stack">
          ${shownSessions.map(sessionBar).join("")}
          ${sessions.length > 3 ? `<span class="more-sessions">+ ${sessions.length - 3} more</span>` : ""}
        </div>
      </div>`);
  }
  $("#calendarGrid").innerHTML = cells.join("");
}

function sessionBar(session) {
  const student = studentFor(session.studentId);
  const subjectClass = session.subject.toLowerCase();
  const duration = Number(session.duration) === 1 ? "1h" : `${session.duration}h`;
  return `<button class="session-bar ${subjectClass}" type="button" data-session-id="${session.id}" title="Edit ${escapeHtml(student?.name || "Deleted student")}'s session">
    <span class="session-main"><span class="session-name">${escapeHtml(student?.name || "Deleted student")}</span><span class="session-time">${session.time} · ${duration}</span></span>
    <i class="session-status ${session.payment}" aria-label="${session.payment === "paid" ? "Paid" : "Still to pay"}"></i>
  </button>`;
}

function renderStudents() {
  const list = $("#studentList");
  if (!state.students.length) {
    list.innerHTML = `<div class="empty-state"><strong>No students yet</strong>Add your first learner to start scheduling sessions.</div>`;
    return;
  }
  list.innerHTML = [...state.students].sort((a, b) => a.name.localeCompare(b.name)).map((student) => {
    const sessions = state.sessions.filter((session) => session.studentId === student.id);
    return `<article class="student-row">
      <span class="initials">${initials(student.name)}</span>
      <div><h3>${escapeHtml(student.name)}</h3><p>${sessions.length} session${sessions.length === 1 ? "" : "s"} recorded</p></div>
      <span class="subject-pill ${student.subject.toLowerCase()}">${student.subject}</span>
      <div class="row-actions"><button class="mini-button" type="button" data-edit-student="${student.id}">Edit</button><button class="mini-button" type="button" data-book-student="${student.id}">Book</button></div>
    </article>`;
  }).join("");
}

function renderPayments() {
  const unpaid = state.sessions.filter((session) => session.payment === "unpaid").sort((a, b) => a.date.localeCompare(b.date));
  const paidTotal = state.sessions.filter((session) => session.payment === "paid").reduce((sum, session) => sum + Number(session.fee), 0);
  const unpaidTotal = unpaid.reduce((sum, session) => sum + Number(session.fee), 0);
  $("#paymentsSummary").innerHTML = `<div><span>All-time earned</span><strong>${money(paidTotal + unpaidTotal)}</strong></div><div><span>Received</span><strong>${money(paidTotal)}</strong></div><div><span>Outstanding</span><strong>${money(unpaidTotal)}</strong></div>`;
  const list = $("#paymentList");
  if (!unpaid.length) {
    list.innerHTML = `<div class="empty-state"><strong>You’re all settled</strong>There are no unpaid sessions at the moment.</div>`;
    return;
  }
  list.innerHTML = unpaid.map((session) => {
    const student = studentFor(session.studentId);
    return `<article class="payment-row">
      <span class="initials">${initials(student?.name || "?")}</span>
      <div><h3>${escapeHtml(student?.name || "Deleted student")}</h3><p>${niceDate(session.date)} at ${session.time}</p></div>
      <span class="subject-pill ${session.subject.toLowerCase()}">${session.subject}</span>
      <strong class="amount">${money(session.fee)}</strong>
      <div class="row-actions"><button class="mini-button" type="button" data-edit-session="${session.id}">Edit</button><button class="mini-button pay" type="button" data-mark-paid="${session.id}">Mark paid</button></div>
    </article>`;
  }).join("");
}

function refreshStudentOptions() {
  const select = $("#sessionStudent");
  const currentValue = select.value;
  select.innerHTML = state.students.length
    ? `<option value="">Choose a student</option>${[...state.students].sort((a, b) => a.name.localeCompare(b.name)).map((student) => `<option value="${student.id}">${escapeHtml(student.name)}</option>`).join("")}`
    : `<option value="">Add a student first</option>`;
  select.value = currentValue;
}

function openSessionModal(date = isoDate(new Date()), studentId = "", sessionId = "") {
  if (!state.students.length) {
    showView("students");
    openStudentModal();
    showToast("Add a student before booking a session");
    return;
  }
  refreshStudentOptions();
  const existing = sessionId ? state.sessions.find((session) => session.id === sessionId) : null;
  $("#sessionModalTitle").textContent = existing ? "Edit session" : "Add a session";
  $("#sessionId").value = existing?.id || "";
  $("#sessionStudent").value = existing?.studentId || studentId;
  $("#sessionDate").value = existing?.date || date;
  $("#sessionTime").value = existing?.time || "15:00";
  $("#sessionSubject").value = existing?.subject || studentFor(studentId)?.subject || "Maths";
  $("#sessionDuration").value = String(existing?.duration || 1);
  $("#sessionFee").value = existing?.fee ?? RATE;
  $("#sessionPayment").value = existing?.payment || "unpaid";
  $("#sessionNote").value = existing?.note || "";
  $("#deleteSessionButton").classList.toggle("hidden", !existing);
  $("#sessionModal").showModal();
}

function openStudentModal(studentId = "") {
  const existing = studentId ? studentFor(studentId) : null;
  $("#studentModalTitle").textContent = existing ? "Edit student" : "Add a student";
  $("#studentId").value = existing?.id || "";
  $("#studentName").value = existing?.name || "";
  $("#studentSubject").value = existing?.subject || "Maths";
  $("#deleteStudentButton").classList.toggle("hidden", !existing);
  $("#studentModal").showModal();
  setTimeout(() => $("#studentName").focus(), 0);
}

function saveSession(event) {
  event.preventDefault();
  const id = $("#sessionId").value || uid("ses");
  const session = {
    id,
    studentId: $("#sessionStudent").value,
    date: $("#sessionDate").value,
    time: $("#sessionTime").value,
    subject: $("#sessionSubject").value,
    duration: Number($("#sessionDuration").value),
    fee: Number($("#sessionFee").value),
    payment: $("#sessionPayment").value,
    note: $("#sessionNote").value.trim()
  };
  const index = state.sessions.findIndex((item) => item.id === id);
  if (index >= 0) state.sessions[index] = session;
  else state.sessions.push(session);
  persist(index >= 0 ? "Session updated" : "Session added");
  $("#sessionModal").close();
  const chosenDate = new Date(`${session.date}T12:00:00`);
  visibleMonth = new Date(chosenDate.getFullYear(), chosenDate.getMonth(), 1);
  renderAll();
}

function saveStudent(event) {
  event.preventDefault();
  const id = $("#studentId").value || uid("stu");
  const student = { id, name: $("#studentName").value.trim(), subject: $("#studentSubject").value };
  const index = state.students.findIndex((item) => item.id === id);
  if (index >= 0) state.students[index] = student;
  else state.students.push(student);
  persist(index >= 0 ? "Student updated" : "Student added");
  $("#studentModal").close();
  renderAll();
}

function deleteSession() {
  const id = $("#sessionId").value;
  if (!id || !window.confirm("Delete this session? This cannot be undone.")) return;
  state.sessions = state.sessions.filter((session) => session.id !== id);
  persist("Session deleted");
  $("#sessionModal").close();
  renderAll();
}

function deleteStudent() {
  const id = $("#studentId").value;
  const count = state.sessions.filter((session) => session.studentId === id).length;
  const detail = count ? ` This will also delete ${count} linked session${count === 1 ? "" : "s"}.` : "";
  if (!id || !window.confirm(`Delete this student?${detail}`)) return;
  state.students = state.students.filter((student) => student.id !== id);
  state.sessions = state.sessions.filter((session) => session.studentId !== id);
  persist("Student deleted");
  $("#studentModal").close();
  renderAll();
}

function showView(viewName) {
  $$("[data-view-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.viewPanel === viewName));
  $$("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
  closeDrawer();
  if (viewName === "payments") renderPayments();
}

function openDrawer() {
  $("#sideMenu").classList.add("open");
  $("#drawerScrim").classList.add("open");
  $("#sideMenu").setAttribute("aria-hidden", "false");
  $("#menuButton").setAttribute("aria-expanded", "true");
}

function closeDrawer() {
  $("#sideMenu").classList.remove("open");
  $("#drawerScrim").classList.remove("open");
  $("#sideMenu").setAttribute("aria-hidden", "true");
  $("#menuButton").setAttribute("aria-expanded", "false");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

$("#menuButton").addEventListener("click", openDrawer);
$("#closeMenuButton").addEventListener("click", closeDrawer);
$("#drawerScrim").addEventListener("click", closeDrawer);
$$('[data-close-modal]').forEach((button) => button.addEventListener("click", () => $(`#${button.dataset.closeModal}`).close()));
$$('[data-view]').forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));

$("#prevMonth").addEventListener("click", () => { visibleMonth.setMonth(visibleMonth.getMonth() - 1); renderCalendar(); });
$("#nextMonth").addEventListener("click", () => { visibleMonth.setMonth(visibleMonth.getMonth() + 1); renderCalendar(); });
$("#todayButton").addEventListener("click", () => { const now = new Date(); visibleMonth = new Date(now.getFullYear(), now.getMonth(), 1); renderCalendar(); });
$("#addSessionButton").addEventListener("click", () => openSessionModal());
$("#addStudentButton").addEventListener("click", () => openStudentModal());
$("#sessionForm").addEventListener("submit", saveSession);
$("#studentForm").addEventListener("submit", saveStudent);
$("#deleteSessionButton").addEventListener("click", deleteSession);
$("#deleteStudentButton").addEventListener("click", deleteStudent);
$("#sessionStudent").addEventListener("change", (event) => {
  const student = studentFor(event.target.value);
  if (student && !$("#sessionId").value) $("#sessionSubject").value = student.subject;
});
$("#sessionDuration").addEventListener("change", (event) => {
  $("#sessionFee").value = Math.round(Number(event.target.value) * RATE);
});

$("#calendarGrid").addEventListener("click", (event) => {
  const sessionButton = event.target.closest("[data-session-id]");
  if (sessionButton) { event.stopPropagation(); openSessionModal(undefined, undefined, sessionButton.dataset.sessionId); return; }
  const cell = event.target.closest("[data-date]");
  if (cell) openSessionModal(cell.dataset.date);
});
$("#calendarGrid").addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-date]")) {
    event.preventDefault();
    openSessionModal(event.target.dataset.date);
  }
});

$("#studentList").addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit-student]");
  const book = event.target.closest("[data-book-student]");
  if (edit) openStudentModal(edit.dataset.editStudent);
  if (book) openSessionModal(isoDate(new Date()), book.dataset.bookStudent);
});

$("#paymentList").addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit-session]");
  const paid = event.target.closest("[data-mark-paid]");
  if (edit) openSessionModal(undefined, undefined, edit.dataset.editSession);
  if (paid) {
    const session = state.sessions.find((item) => item.id === paid.dataset.markPaid);
    if (session) { session.payment = "paid"; persist("Payment marked as received"); renderAll(); }
  }
});

document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDrawer(); });
renderAll();
