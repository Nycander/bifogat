import test from "node:test";
import assert from "node:assert/strict";
import { formatHoneySaleDescription } from "./honeySale";

test("formatHoneySaleDescription formats sale with customer and default Swish", () => {
  const desc = formatHoneySaleDescription({
    jarCount: 3,
    jarSizeGrams: 500,
    counterparty: "Anna Andersson",
  });
  assert.equal(desc, "Honungsförsäljning: 3 st burkar (500g) [Swish] till Anna Andersson");
});

test("formatHoneySaleDescription formats anonymous sale without customer", () => {
  const desc = formatHoneySaleDescription({
    jarCount: 1,
    jarSizeGrams: 350,
    paymentMethod: "Kontant",
  });
  assert.equal(desc, "Honungsförsäljning: 1 st burkar (350g) [Kontant]");
});

test("formatHoneySaleDescription trims whitespace in counterparty", () => {
  const desc = formatHoneySaleDescription({
    jarCount: 2,
    jarSizeGrams: 500,
    counterparty: "   Bengt Granne   ",
  });
  assert.equal(desc, "Honungsförsäljning: 2 st burkar (500g) [Swish] till Bengt Granne");
});
