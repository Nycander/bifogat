import test from "node:test";
import assert from "node:assert/strict";
import { Harvest, JarFilling } from "./types.ts";

test("harvest effective yield calculation computes from jar fillings when scale weight is absent", () => {
  const harvestWithoutScaleWeight: Harvest = {
    id: "harvest-1",
    date: "2026-06-15",
    batchName: "Vårskörd 2026",
    honeyWeightGrams: undefined, // Beekeeper did not weigh at sling time
    fillings: [
      {
        id: "fill-1",
        date: "2026-06-18",
        jarCount: 20,
        jarSizeGrams: 500,
        honeyType: "nyslungad",
        createdAt: "2026-06-18T10:00:00Z",
      },
      {
        id: "fill-2",
        date: "2026-06-25",
        jarCount: 40,
        jarSizeGrams: 500,
        honeyType: "rörd",
        createdAt: "2026-06-25T10:00:00Z",
      },
    ],
    createdAt: "2026-06-15T12:00:00Z",
    updatedAt: "2026-06-25T10:00:00Z",
  };

  const jarredGrams = (harvestWithoutScaleWeight.fillings || []).reduce(
    (sum, f) => sum + f.jarCount * f.jarSizeGrams,
    0,
  );

  const effectiveYieldGrams =
    harvestWithoutScaleWeight.honeyWeightGrams && harvestWithoutScaleWeight.honeyWeightGrams > 0
      ? harvestWithoutScaleWeight.honeyWeightGrams
      : jarredGrams;

  assert.equal(effectiveYieldGrams, 30000); // 30 kg from jar fillings
  assert.equal(effectiveYieldGrams / 1000, 30);
});

test("honey preparation type categorizes nyslungad vs rörd honey", () => {
  const fillings: JarFilling[] = [
    {
      id: "f1",
      date: "2026-06-16",
      jarCount: 12,
      jarSizeGrams: 500,
      honeyType: "nyslungad",
      createdAt: "2026-06-16T12:00:00Z",
    },
    {
      id: "f2",
      date: "2026-06-24",
      jarCount: 24,
      jarSizeGrams: 500,
      honeyType: "rörd",
      createdAt: "2026-06-24T12:00:00Z",
    },
  ];

  const nyslungadJars = fillings
    .filter((f) => f.honeyType === "nyslungad")
    .reduce((sum, f) => sum + f.jarCount, 0);

  const rordJars = fillings
    .filter((f) => f.honeyType === "rörd")
    .reduce((sum, f) => sum + f.jarCount, 0);

  assert.equal(nyslungadJars, 12);
  assert.equal(rordJars, 24);
});
