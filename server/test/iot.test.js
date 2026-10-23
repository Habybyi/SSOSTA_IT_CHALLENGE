import { test } from "node:test";
import assert from "node:assert/strict";
import { createsRequest, deviceStatus, formatValue, OFFLINE_AFTER_MIN } from "../src/modules/iot/iot.rules.js";

const now = new Date("2026-10-23T10:00:00Z");
const minutesAgo = (m) => new Date(now.getTime() - m * 60000);
const device = (type, value, seenMinutesAgo = 1) => ({ type, lastValue: { value }, lastSeenAt: minutesAgo(seenMinutesAgo) });

test("IoT: hodnoty sa zobrazia s jednotkou alebo slovom", () => {
  assert.equal(formatValue("HUMIDITY_SENSOR", 42.26), "42.3 %");
  assert.equal(formatValue("TRIP_SENSOR", 1), "ÚNIK");
  assert.equal(formatValue("TRIP_SENSOR", 0), "OK");
  assert.equal(formatValue("SPRINKLER", 1), "Zapnutý");
  assert.equal(formatValue("OTHER", 7), "7");
  assert.equal(formatValue("HUMIDITY_SENSOR", null), "");
});

test("IoT: suchá pôda a nízka hladina sú upozornenie, únik je poplach", () => {
  assert.equal(deviceStatus(device("HUMIDITY_SENSOR", 35), now).level, "ok");
  assert.equal(deviceStatus(device("HUMIDITY_SENSOR", 12), now).level, "warning");
  assert.equal(deviceStatus(device("WATER_LEVEL_SENSOR", 10), now).level, "warning");
  assert.equal(deviceStatus(device("TRIP_SENSOR", 1), now).level, "alert");
  assert.equal(deviceStatus(device("TRIP_SENSOR", 0), now).level, "ok");
});

test("IoT: zariadenie bez dát čaká, bez správy dlhšie ako limit je offline", () => {
  assert.equal(deviceStatus({ type: "HUMIDITY_SENSOR", lastValue: null, lastSeenAt: null }, now).level, "waiting");
  assert.equal(deviceStatus(device("TRIP_SENSOR", 1, OFFLINE_AFTER_MIN + 1), now).level, "offline");
});

test("IoT: požiadavka vznikne len pri úniku vody", () => {
  assert.equal(createsRequest("TRIP_SENSOR", 1), true);
  assert.equal(createsRequest("TRIP_SENSOR", 0), false);
  assert.equal(createsRequest("HUMIDITY_SENSOR", 5), false);
});
