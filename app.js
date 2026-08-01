const STORAGE_KEY = "tutoringTracker.v1";
const RATE = 200;

const defaultState = {
  students: [],
  sessions: [],
  creditTransactions: []
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
    if (saved && Array.isArray(saved.students) && Array.isArray(saved.sessions)) {
      return {
        students: saved.students.map((student) => ({
          ...student,
          parentName: student.parentName || "",
          whatsapp: student.whatsapp || "",
          creditBalance: Number(student.creditBalance || 0)
        })),
        sessions: saved.sessions.map((session) => ({ ...session, prepaidApplied: Number(session.prepaidApplied || 0) })),
        creditTransactions: Array.isArray(saved.creditTransactions) ? saved.creditTransactions : []
      };
    }
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
    <i class="session-status ${session.payment}" aria-label="${session.payment === "unpaid" ? "Still to pay" : session.payment === "prepaid" ? "Covered by prepaid credit" : "Paid"}"></i>
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
    const parentDetails = student.parentName || student.whatsapp
      ? `${student.parentName ? escapeHtml(student.parentName) : "Parent"}${student.whatsapp ? ` · <a href="${whatsappHref(student.whatsapp)}" target="_blank" rel="noopener">${escapeHtml(student.whatsapp)}</a>` : ""}`
      : "No parent contact added";
    return `<article class="student-row">
      <span class="initials">${initials(student.name)}</span>
      <div><h3>${escapeHtml(student.name)}</h3><p>${parentDetails}</p><p>${sessions.length} session${sessions.length === 1 ? "" : "s"} recorded</p></div>
      <div class="student-meta"><span class="subject-pill ${student.subject.toLowerCase()}">${student.subject}</span><span class="credit-badge">Credit ${money(student.creditBalance)}</span></div>
      <div class="row-actions"><button class="mini-button" type="button" data-edit-student="${student.id}">Edit</button><button class="mini-button" type="button" data-topup-student="${student.id}">+ Credit</button><button class="mini-button" type="button" data-book-student="${student.id}">Book</button></div>
    </article>`;
  }).join("");
}

function renderPayments() {
  const unpaid = state.sessions.filter((session) => session.payment === "unpaid").sort((a, b) => a.date.localeCompare(b.date));
  const paidTotal = state.sessions.filter((session) => session.payment !== "unpaid").reduce((sum, session) => sum + Number(session.fee), 0);
  const unpaidTotal = unpaid.reduce((sum, session) => sum + Number(session.fee), 0);
  const creditHeld = state.students.reduce((sum, student) => sum + Number(student.creditBalance || 0), 0);
  $("#paymentsSummary").innerHTML = `<div><span>Lesson value</span><strong>${money(paidTotal + unpaidTotal)}</strong></div><div><span>Covered / paid</span><strong>${money(paidTotal)}</strong></div><div><span>Outstanding</span><strong>${money(unpaidTotal)}</strong></div><div><span>Credit held</span><strong>${money(creditHeld)}</strong></div>`;
  const creditedStudents = state.students.filter((student) => Number(student.creditBalance) > 0).sort((a, b) => b.creditBalance - a.creditBalance);
  $("#creditPanel").innerHTML = `<div class="section-kicker"><span>PREPAID BALANCES</span><small>${creditedStudents.length ? "Available for future lessons" : "No learner credit currently held"}</small></div>${creditedStudents.length ? `<div class="credit-list">${creditedStudents.map((student) => `<button type="button" data-topup-student="${student.id}"><span>${escapeHtml(student.name)}</span><strong>${money(student.creditBalance)}</strong></button>`).join("")}</div>` : ""}`;
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
  $("#sessionRepeat").checked = false;
  $("#repeatControl").classList.toggle("hidden", Boolean(existing));
  $("#repeatUntilLabel").classList.add("hidden");
  $("#sessionRepeatUntil").required = false;
  syncRepeatUntil();
  $("#deleteSessionButton").classList.toggle("hidden", !existing);
  $("#sessionModal").showModal();
}

function openStudentModal(studentId = "") {
  const existing = studentId ? studentFor(studentId) : null;
  $("#studentModalTitle").textContent = existing ? "Edit student" : "Add a student";
  $("#studentId").value = existing?.id || "";
  $("#studentName").value = existing?.name || "";
  $("#studentSubject").value = existing?.subject || "Maths";
  $("#studentParent").value = existing?.parentName || "";
  $("#studentWhatsapp").value = existing?.whatsapp || "";
  $("#deleteStudentButton").classList.toggle("hidden", !existing);
  $("#studentModal").showModal();
  setTimeout(() => $("#studentName").focus(), 0);
}

function openCreditModal(studentId) {
  const student = studentFor(studentId);
  if (!student) return;
  $("#creditStudentId").value = student.id;
  $("#creditStudentName").textContent = `${student.name} currently has ${money(student.creditBalance)} available.`;
  $("#creditAmount").value = RATE;
  $("#creditDate").value = isoDate(new Date());
  $("#creditNote").value = "";
  $("#creditModal").showModal();
  setTimeout(() => $("#creditAmount").focus(), 0);
}

function saveSession(event) {
  event.preventDefault();
  const existingId = $("#sessionId").value;
  const existing = existingId ? state.sessions.find((item) => item.id === existingId) : null;
  const baseSession = {
    studentId: $("#sessionStudent").value,
    date: $("#sessionDate").value,
    time: $("#sessionTime").value,
    subject: $("#sessionSubject").value,
    duration: Number($("#sessionDuration").value),
    fee: Number($("#sessionFee").value),
    payment: $("#sessionPayment").value,
    prepaidApplied: 0,
    note: $("#sessionNote").value.trim()
  };
  const student = studentFor(baseSession.studentId);
  if (!student) return;

  if (existing) {
    const duplicate = state.sessions.some((item) => item.id !== existing.id && item.studentId === baseSession.studentId && item.date === baseSession.date && item.time === baseSession.time);
    if (duplicate) { showToast("That student already has a lesson at this time"); return; }
    const refundable = existing.studentId === student.id ? Number(existing.prepaidApplied || 0) : 0;
    if (baseSession.payment === "prepaid" && Number(student.creditBalance) + refundable < baseSession.fee) {
      showToast(`Only ${money(Number(student.creditBalance) + refundable)} prepaid credit is available`);
      return;
    }
    refundPrepaid(existing);
    const updated = { ...baseSession, id: existing.id, seriesId: existing.seriesId || "" };
    applyPayment(updated, false);
    state.sessions[state.sessions.findIndex((item) => item.id === existing.id)] = updated;
    persist("Session updated");
  } else {
    const repeat = $("#sessionRepeat").checked;
    const dates = repeat ? weeklyDates(baseSession.date, $("#sessionRepeatUntil").value) : [baseSession.date];
    if (!dates.length) { showToast("Choose a recurrence end date on or after the first lesson"); return; }
    if (dates.length > 53) { showToast("Weekly bookings are limited to one year at a time"); return; }
    const uniqueDates = dates.filter((date) => !state.sessions.some((item) => item.studentId === baseSession.studentId && item.date === date && item.time === baseSession.time));
    if (!uniqueDates.length) { showToast("Those weekly lessons already exist"); return; }
    if (!repeat && baseSession.payment === "prepaid" && Number(student.creditBalance) < baseSession.fee) {
      showToast(`Only ${money(student.creditBalance)} prepaid credit is available`);
      return;
    }
    const seriesId = repeat ? uid("series") : "";
    let prepaidCount = 0;
    let unpaidCount = 0;
    uniqueDates.forEach((date) => {
      const session = { ...baseSession, id: uid("ses"), date, seriesId };
      if (applyPayment(session, repeat)) prepaidCount += 1;
      if (session.payment === "unpaid") unpaidCount += 1;
      state.sessions.push(session);
    });
    const skipped = dates.length - uniqueDates.length;
    let message = repeat ? `${uniqueDates.length} weekly sessions added` : "Session added";
    if (prepaidCount) message += ` · ${prepaidCount} from credit`;
    if (unpaidCount && baseSession.payment === "prepaid") message += ` · ${unpaidCount} to pay`;
    if (skipped) message += ` · ${skipped} duplicate skipped`;
    persist(message);
  }
  $("#sessionModal").close();
  const chosenDate = new Date(`${baseSession.date}T12:00:00`);
  visibleMonth = new Date(chosenDate.getFullYear(), chosenDate.getMonth(), 1);
  renderAll();
}

function applyPayment(session, allowPrepaidFallback) {
  if (session.payment !== "prepaid") return false;
  const student = studentFor(session.studentId);
  if (student && Number(student.creditBalance) >= Number(session.fee)) {
    student.creditBalance = Number(student.creditBalance) - Number(session.fee);
    session.prepaidApplied = Number(session.fee);
    return true;
  }
  if (allowPrepaidFallback) session.payment = "unpaid";
  return false;
}

function refundPrepaid(session) {
  const amount = Number(session?.prepaidApplied || 0);
  const student = session ? studentFor(session.studentId) : null;
  if (student && amount > 0) student.creditBalance = Number(student.creditBalance) + amount;
}

function weeklyDates(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const cursor = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const dates = [];
  while (cursor <= end && dates.length <= 53) {
    dates.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return dates;
}

function syncRepeatUntil() {
  const startValue = $("#sessionDate").value || isoDate(new Date());
  const start = new Date(`${startValue}T12:00:00`);
  const suggested = new Date(start);
  suggested.setDate(suggested.getDate() + 56);
  $("#sessionRepeatUntil").min = startValue;
  if (!$("#sessionRepeatUntil").value || $("#sessionRepeatUntil").value < startValue) $("#sessionRepeatUntil").value = isoDate(suggested);
}

function saveStudent(event) {
  event.preventDefault();
  const id = $("#studentId").value || uid("stu");
  const index = state.students.findIndex((item) => item.id === id);
  const student = {
    ...(index >= 0 ? state.students[index] : { creditBalance: 0 }),
    id,
    name: $("#studentName").value.trim(),
    subject: $("#studentSubject").value,
    parentName: $("#studentParent").value.trim(),
    whatsapp: $("#studentWhatsapp").value.trim()
  };
  if (index >= 0) state.students[index] = student;
  else state.students.push(student);
  persist(index >= 0 ? "Student updated" : "Student added");
  $("#studentModal").close();
  renderAll();
}

function saveCredit(event) {
  event.preventDefault();
  const student = studentFor($("#creditStudentId").value);
  const amount = Number($("#creditAmount").value);
  if (!student || amount <= 0) return;
  student.creditBalance = Number(student.creditBalance) + amount;
  state.creditTransactions.push({ id: uid("credit"), studentId: student.id, amount, date: $("#creditDate").value, note: $("#creditNote").value.trim() });
  persist(`${money(amount)} credit added for ${student.name}`);
  $("#creditModal").close();
  renderAll();
}

function deleteSession() {
  const id = $("#sessionId").value;
  if (!id || !window.confirm("Delete this session? This cannot be undone.")) return;
  refundPrepaid(state.sessions.find((session) => session.id === id));
  state.sessions = state.sessions.filter((session) => session.id !== id);
  persist("Session deleted");
  $("#sessionModal").close();
  renderAll();
}

function deleteStudent() {
  const id = $("#studentId").value;
  const student = studentFor(id);
  const count = state.sessions.filter((session) => session.studentId === id).length;
  const credit = Number(student?.creditBalance || 0);
  const detail = `${count ? ` This will also delete ${count} linked session${count === 1 ? "" : "s"}.` : ""}${credit ? ` ${money(credit)} prepaid credit will also be removed.` : ""}`;
  if (!id || !window.confirm(`Delete this student?${detail}`)) return;
  state.students = state.students.filter((student) => student.id !== id);
  state.sessions = state.sessions.filter((session) => session.studentId !== id);
  state.creditTransactions = state.creditTransactions.filter((transaction) => transaction.studentId !== id);
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

function whatsappHref(value) {
  let digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `27${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
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
$("#creditForm").addEventListener("submit", saveCredit);
$("#deleteSessionButton").addEventListener("click", deleteSession);
$("#deleteStudentButton").addEventListener("click", deleteStudent);
$("#sessionStudent").addEventListener("change", (event) => {
  const student = studentFor(event.target.value);
  if (student && !$("#sessionId").value) $("#sessionSubject").value = student.subject;
});
$("#sessionDuration").addEventListener("change", (event) => {
  $("#sessionFee").value = Math.round(Number(event.target.value) * RATE);
});
$("#sessionDate").addEventListener("change", syncRepeatUntil);
$("#sessionRepeat").addEventListener("change", (event) => {
  $("#repeatUntilLabel").classList.toggle("hidden", !event.target.checked);
  $("#sessionRepeatUntil").required = event.target.checked;
  if (event.target.checked) syncRepeatUntil();
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
  const topup = event.target.closest("[data-topup-student]");
  if (edit) openStudentModal(edit.dataset.editStudent);
  if (book) openSessionModal(isoDate(new Date()), book.dataset.bookStudent);
  if (topup) openCreditModal(topup.dataset.topupStudent);
});

$("#creditPanel").addEventListener("click", (event) => {
  const topup = event.target.closest("[data-topup-student]");
  if (topup) openCreditModal(topup.dataset.topupStudent);
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
