import { test } from "node:test";
import assert from "node:assert/strict";
import { guessType, isUrgent } from "../src/modules/intake/intake.service.js";

test("typ požiadavky z textu e-mailu", () => {
  assert.equal(guessType("Nefunguje zóna 2, tečie voda"), "FAULT");
  assert.equal(guessType("Chcel by som objednať zazimovanie"), "WINTERIZATION");
  assert.equal(guessType("Kedy môžete spustiť závlahu?"), "SPRING_START");
  assert.equal(guessType("Potrebujeme pokosiť trávnik"), "LAWN_CARE");
  assert.equal(guessType("Zaujíma ma cena nového systému"), "INSTALLATION");
  assert.equal(guessType("Dobrý deň, ďakujem"), "OTHER");
});

test("urgentné slová zvýšia prioritu", () => {
  assert.ok(isUrgent("Tečie voda zo šachty"));
  assert.ok(isUrgent("SÚRNE prosím"));
  assert.ok(!isUrgent("Objednávam zazimovanie"));
});
