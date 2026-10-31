import test from "node:test";
import assert from "node:assert/strict";

/**
 * Determines whether a given input target element is a single-line text input
 * that should dismiss the software keyboard on Enter keydown.
 */
export function shouldBlurInputOnEnter(tagName: string, inputType?: string): boolean {
  if (!tagName || tagName.toUpperCase() !== "INPUT") {
    return false;
  }

  const type = (inputType || "text").toLowerCase();
  const excludedTypes = [
    "checkbox",
    "radio",
    "button",
    "submit",
    "image",
    "file",
    "reset",
  ];

  return !excludedTypes.includes(type);
}

test("shouldBlurInputOnEnter returns true for standard text inputs", () => {
  assert.equal(shouldBlurInputOnEnter("INPUT", "text"), true);
  assert.equal(shouldBlurInputOnEnter("INPUT", "date"), true);
  assert.equal(shouldBlurInputOnEnter("INPUT", "number"), true);
  assert.equal(shouldBlurInputOnEnter("INPUT", "search"), true);
  assert.equal(shouldBlurInputOnEnter("input", ""), true);
});

test("shouldBlurInputOnEnter returns false for non-text inputs (checkboxes, buttons)", () => {
  assert.equal(shouldBlurInputOnEnter("INPUT", "checkbox"), false);
  assert.equal(shouldBlurInputOnEnter("INPUT", "radio"), false);
  assert.equal(shouldBlurInputOnEnter("INPUT", "submit"), false);
  assert.equal(shouldBlurInputOnEnter("INPUT", "file"), false);
});

test("shouldBlurInputOnEnter returns false for multiline textareas and divs", () => {
  assert.equal(shouldBlurInputOnEnter("TEXTAREA", "text"), false);
  assert.equal(shouldBlurInputOnEnter("DIV", "text"), false);
  assert.equal(shouldBlurInputOnEnter("BUTTON", "button"), false);
});
