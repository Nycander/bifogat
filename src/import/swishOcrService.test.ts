import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkAbortSignal, recognizeSwishScreenshot } from "./swishOcrService";

describe("swishOcrService abort logic", () => {
  it("checkAbortSignal throws DOMException AbortError when signal is aborted", () => {
    const controller = new AbortController();
    controller.abort();

    assert.throws(
      () => checkAbortSignal(controller.signal),
      (err: any) => err instanceof DOMException && err.name === "AbortError" && err.message === "Avbruten",
    );
  });

  it("checkAbortSignal does not throw when signal is not aborted or undefined", () => {
    const controller = new AbortController();
    assert.doesNotThrow(() => checkAbortSignal(controller.signal));
    assert.doesNotThrow(() => checkAbortSignal(undefined));
  });

  it("recognizeSwishScreenshot rejects immediately with AbortError if signal is pre-aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const dummyBlob = new Blob(["fake-image-bytes"], { type: "image/png" });

    await assert.rejects(
      async () => {
        await recognizeSwishScreenshot(dummyBlob, () => {}, controller.signal);
      },
      (err: any) => err.name === "AbortError" && err.message === "Avbruten",
    );
  });
});
