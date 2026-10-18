import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "../src/lib/phone.js";

test("rôzne zápisy toho istého čísla dajú rovnaký výsledok", () => {
  for (const input of ["0905 111 222", "+421 905 111 222", "00421905111222", "+421905111222", "0905/111-222"]) {
    assert.equal(normalizePhone(input), "421905111222", input);
  }
});

test("prázdne číslo je null", () => {
  assert.equal(normalizePhone(""), null);
  assert.equal(normalizePhone(null), null);
  assert.equal(normalizePhone("bez čísla"), null);
});
