import { test } from "node:test";
import assert from "node:assert/strict";
import { isBot, normalizeSource } from "../src/modules/webstats/webstats.rules.js";

test("zdroje návštev sa zjednotia", () => {
  assert.equal(normalizeSource("google.sk"), "Google");
  assert.equal(normalizeSource("www.google.com"), "Google");
  assert.equal(normalizeSource("l.facebook.com"), "Facebook");
  assert.equal(normalizeSource("m.facebook.com"), "Facebook");
  assert.equal(normalizeSource("instagram.com"), "Instagram");
  assert.equal(normalizeSource("priamo"), "Priamo");
  assert.equal(normalizeSource(""), "Priamo");
  assert.equal(normalizeSource("www.zahradkari.sk"), "zahradkari.sk");
  assert.equal(normalizeSource("<script>"), "script");
});

test("roboty sa nepočítajú", () => {
  assert.equal(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)"), true);
  assert.equal(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), false);
});
