import { describe, it, expect } from "vitest";
import {
  ART_OFFSET_MS,
  startOfDayART,
  startOfWeekART,
  startOfMonthART,
} from "@/lib/admin/dashboard/dates";

describe("dashboard/dates (ART = UTC−3 fija)", () => {
  // 2026-06-05T01:30:00Z = 2026-06-04 22:30 ART (miércoles→jueves cruzando medianoche)
  const now = new Date("2026-06-05T01:30:00Z");

  it("ART_OFFSET_MS son 3 horas en ms", () => {
    expect(ART_OFFSET_MS).toBe(3 * 60 * 60 * 1000);
  });

  it("startOfDayART = medianoche ART del día local, en UTC", () => {
    expect(startOfDayART(now).toISOString()).toBe("2026-06-04T03:00:00.000Z");
  });

  it("startOfDayART respeta el día ART cuando UTC ya pasó a otro día", () => {
    const midday = new Date("2026-06-05T12:00:00Z");
    expect(startOfDayART(midday).toISOString()).toBe(
      "2026-06-05T03:00:00.000Z",
    );
  });

  it("startOfWeekART = lunes 00:00 ART, en UTC", () => {
    expect(startOfWeekART(now).toISOString()).toBe("2026-06-01T03:00:00.000Z");
  });

  it("startOfWeekART trata el domingo como fin de semana (lunes anterior)", () => {
    const sunday = new Date("2026-06-07T15:00:00Z");
    expect(startOfWeekART(sunday).toISOString()).toBe(
      "2026-06-01T03:00:00.000Z",
    );
  });

  it("startOfMonthART = día 1 00:00 ART, en UTC", () => {
    expect(startOfMonthART(now).toISOString()).toBe("2026-06-01T03:00:00.000Z");
  });

  it("startOfMonthART usa el mes ART, no el UTC", () => {
    const cross = new Date("2026-07-01T01:00:00Z");
    expect(startOfMonthART(cross).toISOString()).toBe(
      "2026-06-01T03:00:00.000Z",
    );
  });
});
