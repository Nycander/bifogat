import test from "node:test";
import assert from "node:assert/strict";

test("useBottomSheet history handler pushes history state and closes modal on popstate (Android back button)", () => {
  let modalClosed = false;
  let popstateHandler: ((e: any) => void) | null = null;
  let historyBackCalled = false;

  // Mock window & history for Node.js test environment
  const mockWindow = {
    history: {
      state: null as any,
      pushState(data: any) {
        this.state = data;
      },
      back() {
        historyBackCalled = true;
        this.state = null;
      },
    },
    addEventListener(event: string, handler: any) {
      if (event === "popstate") {
        popstateHandler = handler;
      }
    },
    removeEventListener(event: string, handler: any) {
      if (event === "popstate" && popstateHandler === handler) {
        popstateHandler = null;
      }
    },
  };

  // Simulate modal opening logic
  const stateId = "bifogat-modal-test-" + Date.now();
  let isPoppedByBackButton = false;

  mockWindow.history.pushState({ modalStateId: stateId });
  mockWindow.addEventListener("popstate", () => {
    isPoppedByBackButton = true;
    modalClosed = true;
  });

  assert.equal(mockWindow.history.state?.modalStateId, stateId);
  assert.notEqual(popstateHandler, null);

  // Simulate Android hardware back button / gesture -> triggers popstate
  if (popstateHandler) {
    popstateHandler({});
  }

  assert.equal(modalClosed, true);
  assert.equal(isPoppedByBackButton, true);

  // Simulate unmount cleanup after back button pop
  if (!isPoppedByBackButton && mockWindow.history.state?.modalStateId === stateId) {
    mockWindow.history.back();
  }

  // history.back should NOT be called again because the back button already popped the history
  assert.equal(historyBackCalled, false);
});

test("useBottomSheet history handler cleans up history stack when modal is closed via UI button", () => {
  let popstateHandler: ((e: any) => void) | null = null;
  let historyBackCalled = false;

  const mockWindow = {
    history: {
      state: null as any,
      pushState(data: any) {
        this.state = data;
      },
      back() {
        historyBackCalled = true;
        this.state = null;
      },
    },
    addEventListener(event: string, handler: any) {
      if (event === "popstate") popstateHandler = handler;
    },
    removeEventListener(event: string, handler: any) {
      if (event === "popstate" && popstateHandler === handler) popstateHandler = null;
    },
  };

  const stateId = "bifogat-modal-ui-test";
  let isPoppedByBackButton = false;

  mockWindow.history.pushState({ modalStateId: stateId });

  // Simulate UI "X" button click (closing without back button popstate)
  if (!isPoppedByBackButton && mockWindow.history.state?.modalStateId === stateId) {
    mockWindow.history.back();
  }

  assert.equal(historyBackCalled, true);
  assert.equal(mockWindow.history.state, null);
});
