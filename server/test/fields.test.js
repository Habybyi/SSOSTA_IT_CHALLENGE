import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { optionalNumber, optionalText, optionalEmail } from "../src/lib/fields.js";

const schema = z.object({
  pressure: optionalNumber({ min: 0, max: 20 }),
  count: optionalNumber({ min: 0, int: true }),
  note: optionalText(10),
  email: optionalEmail,
});

test("číslo s desatinnou čiarkou z formulára", () => {
  assert.equal(schema.parse({ pressure: "3,5" }).pressure, 3.5);
});

test("prázdne pole z formulára je null, chýbajúce pole sa nemení", () => {
  const data = schema.parse({ pressure: "", note: "   " });
  assert.equal(data.pressure, null);
  assert.equal(data.note, null);
  assert.equal("count" in data ? data.count : undefined, undefined);
});

test("e-mail sa očistí a zmenší", () => {
  assert.equal(schema.parse({ email: "  Jan@Example.SK " }).email, "jan@example.sk");
});

test("neplatné hodnoty vrátia chybu", () => {
  assert.equal(schema.safeParse({ pressure: "abc" }).success, false);
  assert.equal(schema.safeParse({ pressure: "50" }).success, false);
  assert.equal(schema.safeParse({ count: "2.5" }).success, false);
  assert.equal(schema.safeParse({ note: "príliš dlhý text" }).success, false);
  assert.equal(schema.safeParse({ email: "nie-email" }).success, false);
});
