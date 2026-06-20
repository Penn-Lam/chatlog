import { expect, test } from "bun:test";
import { formatDoctorReport, runDoctor } from "../src/agent/doctor";

test("doctor reports runtime, parsers, and skills", async () => {
  const report = await runDoctor();

  expect(report.name).toBe("chatlog-exporter");
  expect(report.version).toBeTruthy();
  expect(report.checks.some((check) => check.id === "runtime")).toBe(true);
  expect(report.checks.some((check) => check.id === "parsers")).toBe(true);
  expect(report.checks.some((check) => check.id === "skill-templates")).toBe(true);
});

test("doctor report formats as text", async () => {
  const report = await runDoctor();
  const text = formatDoctorReport(report);

  expect(text).toContain("chatlog-exporter");
  expect(text).toContain("Supported parsers");
});

