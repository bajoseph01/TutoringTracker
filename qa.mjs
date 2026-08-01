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
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
  console.log(`${condition ? "PASS" : "FAIL"}: ${message}`);
};

try {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  check(await page.locator("#calendarGrid .day-cell").count() === 42, "calendar renders 42 date cells");
  check(await page.locator("#earnedTotal").textContent() === "R0", "empty month starts at R0 earned");

  await page.locator("#menuButton").click();
  await page.locator('[data-view="students"]').click();
  await page.locator("#addStudentButton").click();
  await page.locator("#studentName").fill("Noah Petersen");
  await page.locator("#studentSubject").selectOption("Afrikaans");
  await page.locator("#studentForm button[type=submit]").click();
  check(await page.locator("#studentList").getByText("Noah Petersen").count() === 1, "new student appears in student list");

  await page.locator("#menuButton").click();
  await page.locator('[data-view="calendar"]').click();
  await page.locator("#addSessionButton").click();
  await page.locator("#sessionStudent").selectOption({ label: "Noah Petersen" });
  await page.locator("#sessionDate").fill("2026-08-12");
  await page.locator("#sessionTime").fill("15:30");
  await page.locator("#sessionDuration").selectOption("1.5");
  check(await page.locator("#sessionFee").inputValue() === "300", "duration automatically applies the R200 hourly rate");
  await page.locator("#sessionNote").fill("Taal revision");
  await page.locator("#sessionForm button[type=submit]").click();

  check(await page.locator("#earnedTotal").textContent() === "R300", "monthly earned total reflects session fee");
  check(await page.locator("#outstandingTotal").textContent() === "R300", "monthly outstanding total reflects unpaid session");
  check(await page.locator(".session-bar.afrikaans").getByText("Noah Petersen").count() === 1, "Afrikaans session is colour-coded on calendar");
  await page.screenshot({ path: fileURLToPath(new URL("desktop-calendar.png", evidence)), fullPage: true });

  await page.locator("#menuButton").click();
  await page.locator('[data-view="payments"]').click();
  check(await page.locator("#paymentList").getByText("Noah Petersen").count() === 1, "unpaid session appears in Payments");
  await page.locator("[data-mark-paid]").click();
  check(await page.locator("#paymentsSummary").getByText("R0").count() >= 1, "mark-paid action clears outstanding amount");

  await page.reload({ waitUntil: "networkidle" });
  check(await page.locator("#earnedTotal").textContent() === "R300", "session and totals persist after refresh");
  check(await page.locator("#outstandingTotal").textContent() === "R0", "paid status persists after refresh");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: fileURLToPath(new URL("mobile-calendar.png", evidence)), fullPage: true });
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  check(bodyWidth === 390, "mobile page has no body-level horizontal overflow");

  if (failures.length) throw new Error(`${failures.length} QA check(s) failed: ${failures.join("; ")}`);
} finally {
  await browser.close();
  server.kill();
}
