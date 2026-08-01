import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const url = process.env.APP_URL || "http://127.0.0.1:4173";
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const evidence = new URL("./quality/gauntlet/evidence/", import.meta.url);
await mkdir(evidence, { recursive: true });

const server = spawn(process.execPath, [fileURLToPath(new URL("./server.mjs", import.meta.url))], { stdio: "ignore" });
for (let attempt = 0; attempt < 30; attempt += 1) {
  try {
    const response = await fetch(url);
    if (response.ok) break;
  } catch {
    if (attempt === 29) throw new Error(`Local app did not start at ${url}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 150));
}

const browser = await chromium.launch({ headless: true, executablePath: edgePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.on("pageerror", (error) => console.error(`PAGE ERROR: ${error.message}`));
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
  console.log(`${condition ? "PASS" : "FAIL"}: ${message}`);
};

try {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem("tutoringTracker.v1", JSON.stringify({
      students: [{ id: "legacy-student", name: "Existing Learner", subject: "Maths" }],
      sessions: [{ id: "legacy-session", studentId: "legacy-student", date: "2026-07-27", time: "15:00", subject: "Maths", duration: 1, fee: 200, payment: "paid", note: "Existing lesson" }]
    }));
  });
  await page.reload({ waitUntil: "networkidle" });

  check(await page.locator("#calendarGrid .day-cell").count() === 42, "calendar renders 42 date cells");
  check(await page.locator("#earnedTotal").textContent() === "R0", "empty month starts at R0 earned");

  await page.locator("#menuButton").click();
  await page.locator('[data-view="students"]').click();
  check(await page.locator("#studentList").getByText("Existing Learner").count() === 1, "legacy student survives schema migration");
  await page.locator('[data-edit-student="legacy-student"]').click();
  check(await page.locator("#studentParent").inputValue() === "", "new optional parent field does not block legacy student");
  await page.locator('[data-close-modal="studentModal"]').last().click();

  await page.locator("#addStudentButton").click();
  await page.locator("#studentName").fill("Noah Petersen");
  await page.locator("#studentSubject").selectOption("Afrikaans");
  await page.locator("#studentParent").fill("Leanne Petersen");
  await page.locator("#studentWhatsapp").fill("082 123 4567");
  await page.locator("#studentForm button[type=submit]").click();
  check(await page.locator("#studentList").getByText("Noah Petersen").count() === 1, "new student appears in student list");
  check(await page.locator('#studentList a[href="https://wa.me/27821234567"]').count() === 1, "South African WhatsApp number creates a valid contact shortcut");

  await page.locator("article", { hasText: "Noah Petersen" }).locator("[data-topup-student]").click();
  await page.locator("#creditAmount").fill("1000");
  await page.locator("#creditNote").fill("Five lessons prepaid");
  check(await page.locator("#creditForm").evaluate((form) => form.checkValidity()), "prepaid top-up form is valid before submission");
  await page.locator("#creditForm button[type=submit]").click();
  check(!await page.locator("#creditModal").evaluate((dialog) => dialog.open), "prepaid top-up dialog closes after saving");
  const creditBadge = await page.locator("article", { hasText: "Noah Petersen" }).locator(".credit-badge").textContent();
  check(creditBadge.replace(/\D/g, "") === "1000", "prepaid top-up appears on the learner");
  await page.waitForTimeout(2700);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: fileURLToPath(new URL("desktop-students.png", evidence)), fullPage: true });

  await page.locator("#menuButton").click();
  await page.locator('[data-view="calendar"]').click();
  await page.locator("#addSessionButton").click();
  await page.locator("#sessionStudent").selectOption({ label: "Noah Petersen" });
  await page.locator("#sessionDate").fill("2026-08-12");
  await page.locator("#sessionTime").fill("15:30");
  await page.locator("#sessionDuration").selectOption("1");
  check(await page.locator("#sessionFee").inputValue() === "200", "duration automatically applies the R200 hourly rate");
  await page.locator("#sessionPayment").selectOption("prepaid");
  await page.locator("#sessionNote").fill("Taal revision");
  await page.locator("#sessionRepeat").check();
  await page.locator("#sessionRepeatUntil").fill("2026-09-02");
  await page.locator("#sessionForm button[type=submit]").click();

  check(await page.locator("#earnedTotal").textContent() === "R600", "three August recurrences contribute R600 to the month");
  check(await page.locator("#outstandingTotal").textContent() === "R0", "prepaid recurring sessions are not outstanding");
  check(await page.locator(".session-bar.afrikaans").count() === 4, "weekly Afrikaans sessions repeat across the visible calendar grid");
  const recurringState = await page.evaluate(() => JSON.parse(localStorage.getItem("tutoringTracker.v1")));
  check(recurringState.sessions.filter((session) => session.studentId !== "legacy-student" && session.seriesId).length === 4, "recurrence creates four independent dated sessions through 2 September");
  check(recurringState.students.find((student) => student.name === "Noah Petersen").creditBalance === 200, "four prepaid lessons deduct R800 and leave R200 credit");
  await page.screenshot({ path: fileURLToPath(new URL("desktop-calendar.png", evidence)), fullPage: true });

  await page.locator("#addSessionButton").click();
  await page.locator("#sessionStudent").selectOption({ label: "Noah Petersen" });
  await page.locator("#sessionDate").fill("2026-08-12");
  await page.locator("#sessionTime").fill("15:30");
  await page.locator("#sessionRepeat").check();
  await page.locator("#sessionRepeatUntil").fill("2026-09-02");
  await page.locator("#sessionForm button[type=submit]").click();
  const duplicateState = await page.evaluate(() => JSON.parse(localStorage.getItem("tutoringTracker.v1")));
  check(duplicateState.sessions.length === recurringState.sessions.length, "exact recurring duplicates are skipped");
  await page.locator('[data-close-modal="sessionModal"]').last().click();

  await page.locator("#addSessionButton").click();
  await page.locator("#sessionStudent").selectOption({ label: "Noah Petersen" });
  await page.locator("#sessionDate").fill("2026-08-13");
  await page.locator("#sessionTime").fill("16:00");
  await page.locator("#sessionForm button[type=submit]").click();
  check(await page.locator("#outstandingTotal").textContent() === "R200", "per-lesson unpaid tracking still works beside prepaid credit");

  await page.locator("#menuButton").click();
  await page.locator('[data-view="payments"]').click();
  check(await page.locator("#paymentList").getByText("Noah Petersen").count() === 1, "unpaid session appears in Payments");
  check(await page.locator("#creditPanel").getByText("R200").count() === 1, "remaining prepaid balance appears separately in Payments");
  await page.locator("[data-mark-paid]").click();
  check(await page.locator("#paymentsSummary div").nth(2).locator("strong").textContent() === "R0", "mark-paid action clears outstanding amount");
  await page.waitForTimeout(2700);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: fileURLToPath(new URL("desktop-payments.png", evidence)), fullPage: true });

  await page.reload({ waitUntil: "networkidle" });
  check(await page.locator("#earnedTotal").textContent() === "R800", "sessions and totals persist after refresh");
  check(await page.locator("#outstandingTotal").textContent() === "R0", "paid status persists after refresh");
  const preserved = await page.evaluate(() => JSON.parse(localStorage.getItem("tutoringTracker.v1")));
  const legacyStudent = preserved.students.find((student) => student.id === "legacy-student");
  const legacySession = preserved.sessions.find((session) => session.id === "legacy-session");
  check(legacyStudent.name === "Existing Learner" && legacyStudent.subject === "Maths", "legacy student values remain unchanged after new saves");
  check(legacySession.fee === 200 && legacySession.payment === "paid" && legacySession.note === "Existing lesson", "legacy session values remain unchanged after new saves");

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(".session-bar.prepaid, .session-bar.afrikaans").first().click();
  await page.locator("#deleteSessionButton").click();
  const refunded = await page.evaluate(() => JSON.parse(localStorage.getItem("tutoringTracker.v1")));
  check(refunded.students.find((student) => student.name === "Noah Petersen").creditBalance === 400, "deleting a prepaid lesson restores its R200 credit");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(2700);
  await page.screenshot({ path: fileURLToPath(new URL("mobile-calendar.png", evidence)), fullPage: true });
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  check(bodyWidth === 390, "mobile page has no body-level horizontal overflow");

  if (failures.length) throw new Error(`${failures.length} QA check(s) failed: ${failures.join("; ")}`);
} finally {
  await browser.close();
  server.kill();
}
