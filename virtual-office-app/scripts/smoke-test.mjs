import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import { chromium } from "playwright";

const repoRoot = path.resolve(process.cwd(), "..");
const server = spawn("python3", ["-m", "http.server", "4173", "--bind", "127.0.0.1", "--directory", repoRoot], {
  stdio: "ignore"
});
let browser;

const employees = Array.from({ length: 28 }, (_, index) => ({
  id: "agent-" + String(index + 1).padStart(2, "0"),
  name: "Agent " + String(index + 1).padStart(2, "0"),
  role_key: "role_" + String(index + 1).padStart(2, "0"),
  department: "Department " + String((index % 11) + 1).padStart(2, "0"),
  responsibilities: "Responsible for verified departmental work.",
  status: "planned"
}));
const departments = Array.from({ length: 11 }, (_, index) => ({
  name: "Department " + String(index + 1).padStart(2, "0")
}));
const tasks = [
  { id: "task-working", title: "Working sample", assigned_employee_id: "agent-01", status: "in_progress", priority: "normal" },
  { id: "task-review", title: "Review sample", assigned_employee_id: "agent-02", status: "review", priority: "high" },
  { id: "task-blocked", title: "Blocked sample", assigned_employee_id: "agent-03", status: "blocked", priority: "high" },
  { id: "task-queued", title: "Queued sample", assigned_employee_id: "agent-04", status: "queued", priority: "normal" }
];
const events = [{ id: "event-task-only", employee_id: null, task_id: "task-review", event_type: "review_started", message: "Task-linked activity event", created_at: "2026-11-22T08:00:00Z" }];
const payload = { employees, tasks, events, departments };

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch("http://127.0.0.1:4173/virtual-office/index.html");
      if (response.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error("Static preview server did not start.");
}

async function exerciseViewport(page, label) {
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto("http://127.0.0.1:4173/virtual-office/index.html", { waitUntil: "networkidle" });
  await page.waitForSelector("canvas", { timeout: 15000 });
  await page.evaluate(snapshot => {
    window.postMessage({ type: "curioframe:office-snapshot", payload: snapshot }, window.location.origin);
  }, payload);
  await page.waitForFunction(() => document.querySelectorAll(".agent-name-tag").length === 28, null, { timeout: 20000 });
  await page.locator(".agent-name-tag").filter({ hasText: "Agent 02" }).click({ force: true });
  await page.waitForFunction(() => document.querySelector(".agent-inspector h2")?.textContent === "Agent 02");
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    return canvas && canvas.width > 0 && canvas.height > 0;
  });
  const metrics = await page.evaluate(() => ({
    agents: document.querySelectorAll(".agent-name-tag").length,
    departments: document.querySelector(".office-hud")?.textContent?.match(/11\s*DEPARTMENTS/) !== null,
    canvasWidth: document.querySelector("canvas")?.width || 0,
    canvasHeight: document.querySelector("canvas")?.height || 0,
    connected: document.querySelector(".office-live")?.textContent?.includes("COMPANY DATA RECEIVED") || false
  }));
  assert.equal(metrics.agents, 28, label + ": all 28 Agent labels must render");
  assert.equal(metrics.departments, true, label + ": all 11 departments must be counted");
  assert.ok(metrics.canvasWidth > 0 && metrics.canvasHeight > 0, label + ": WebGL canvas must have a real drawing size");
  assert.equal(metrics.connected, true, label + ": parent snapshot handshake must be accepted");

  await page.evaluate(() => {
    window.postMessage({ type: "curioframe:select-agent", employeeId: "agent-02" }, window.location.origin);
  });
  await page.waitForFunction(() => document.querySelector(".agent-inspector h2")?.textContent === "Agent 02");
  assert.equal(await page.locator(".inspector-status").textContent(), "IN REVIEW");
  assert.equal(await page.locator(".agent-inspector").getByText("review started").count(), 1, label + ": task-linked events must appear in the assigned Agent activity");

  const refreshedPayload = { ...payload, tasks: tasks.map(task => task.id === "task-working" ? { ...task, status: "review" } : task) };
  await page.evaluate(snapshot => window.postMessage({ type: "curioframe:office-snapshot", payload: snapshot }, window.location.origin), refreshedPayload);
  await page.evaluate(() => window.postMessage({ type: "curioframe:select-agent", employeeId: "agent-01" }, window.location.origin));
  await page.waitForFunction(() => document.querySelector(".agent-inspector h2")?.textContent === "Agent 01" && document.querySelector(".inspector-status")?.textContent === "IN REVIEW");

  assert.equal(await page.locator(".floor-switcher button").count(), 3, label + ": Full HQ, Floor 1 and Floor 2 controls must be visible");
  assert.equal(await page.locator(".office-walk-pad").count(), 0, label + ": movement pad must not render");
  assert.equal(await page.locator(".office-crew-picker").count(), 0, label + ": duplicate roster overlay must not render");
  await page.locator(".floor-switcher button").filter({ hasText: "Floor 2" }).click();
  await page.waitForFunction(() => document.querySelector(".floor-switcher button.active")?.textContent === "Floor 2");
  await page.locator(".floor-switcher button").filter({ hasText: "Full HQ" }).click();
  await page.waitForFunction(() => document.querySelector(".floor-switcher button.active")?.textContent === "Full HQ");
  const departmentSelect = page.getByLabel("Visit department");
  assert.equal(await departmentSelect.locator("option").count(), 12, label + ": all 11 departments must be available in the department directory");
  await departmentSelect.selectOption({ label: "Department 07 · 2 agents" });
  await page.waitForFunction(() => document.querySelector(".floor-switcher button.active")?.textContent === "Floor 2");
  await departmentSelect.selectOption({ label: "Department 01 · 3 agents" });
  await page.waitForFunction(() => document.querySelector(".floor-switcher button.active")?.textContent === "Floor 1");
  const visibleAgent = await page.locator(".agent-name-tag").evaluateAll(nodes => {
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    return nodes.map((node, index) => {
      const rect = node.getBoundingClientRect();
      return { index, name: node.textContent.trim(), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2,
        visible: rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.top >= 0 && rect.right <= width && rect.bottom <= height };
    }).find(item => item.visible);
  });
  assert.ok(visibleAgent, label + ": at least one Agent hit target must be visible inside the viewport");
  await page.mouse.click(visibleAgent.x, visibleAgent.y);
  await page.waitForFunction(name => document.querySelector(".agent-inspector h2")?.textContent === name, visibleAgent.name);
  assert.equal(await page.locator(".agent-inspector h2").textContent(), visibleAgent.name, label + ": tapping a visible Agent must open its identity panel");
  assert.deepEqual(pageErrors, [], label + ": no uncaught browser errors");
  return metrics;
}

try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]
  });

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const desktopMetrics = await exerciseViewport(desktop, "Desktop");
  console.log("Desktop smoke test passed:", JSON.stringify(desktopMetrics));

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });
  const mobileMetrics = await exerciseViewport(mobile, "Android-sized touch viewport");
  await mobile.touchscreen.tap(195, 420);
  assert.deepEqual(await mobile.evaluate(() => ({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight
  })), { width: 390, height: 844 });
  console.log("Touch viewport smoke test passed:", JSON.stringify(mobileMetrics));
  console.log("PASS: 28 Agents, 11 departments, snapshot bridge, status inspection, WebGL canvas, desktop and touch viewport.");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
