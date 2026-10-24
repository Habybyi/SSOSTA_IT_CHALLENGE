import { test } from "node:test";
import assert from "node:assert/strict";

process.env.TZ = "Europe/Bratislava";
const dates = await import("../src/lib/dates.js");

test("8:00 je 8:00 slovenského času aj cez zmenu letného času", () => {
  assert.equal(dates.atTime("2026-10-24", "08:00").toISOString(), "2026-10-24T06:00:00.000Z");
  assert.equal(dates.atTime("2026-10-26", "08:00").toISOString(), "2026-10-26T07:00:00.000Z");
});

test("deň v týždni: 1 = pondelok, 7 = nedeľa", () => {
  assert.equal(dates.isoWeekday("2026-10-19"), 1);
  assert.equal(dates.isoWeekday("2026-10-25"), 7);
});

test("pridanie dní cez koniec mesiaca a zmenu času", () => {
  assert.equal(dates.addDays("2026-10-31", 1), "2026-11-01");
  assert.deepEqual(dates.eachDay("2026-10-24", "2026-10-27"), ["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"]);
});

test("neskorý večer patrí ešte do toho istého dňa", () => {
  assert.equal(dates.dayKey(dates.atTime("2026-10-25", "23:30")), "2026-10-25");
});

test("kontrola formátu dňa a času", () => {
  assert.ok(dates.isDay("2026-10-19"));
  assert.ok(!dates.isDay("19.10.2026"));
  assert.ok(dates.isTime("08:15"));
  assert.ok(!dates.isTime("25:00"));
});
