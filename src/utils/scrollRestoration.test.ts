import test from "node:test";
import assert from "node:assert/strict";

type NavTab = "overview" | "hives" | "harvests" | "economy" | "settings";

class ScrollTracker {
  private positions: Record<NavTab, number> = {
    overview: 0,
    hives: 0,
    harvests: 0,
    economy: 0,
    settings: 0,
  };

  private activeTab: NavTab = "overview";

  public getActiveTab(): NavTab {
    return this.activeTab;
  }

  public getPosition(tab: NavTab): number {
    return this.positions[tab] || 0;
  }

  public switchTab(newTab: NavTab, currentScrollY: number): number {
    if (newTab === this.activeTab) {
      return this.positions[newTab];
    }
    // Save scroll for departing tab
    this.positions[this.activeTab] = currentScrollY;
    this.activeTab = newTab;
    // Return saved scroll for entering tab
    return this.positions[newTab] || 0;
  }
}

test("ScrollTracker starts at 0 for all tabs", () => {
  const tracker = new ScrollTracker();
  assert.equal(tracker.getPosition("overview"), 0);
  assert.equal(tracker.getPosition("settings"), 0);
});

test("ScrollTracker saves scroll position when leaving tab and restores when returning", () => {
  const tracker = new ScrollTracker();

  // User scrolls down on settings to 650px
  const restoreOverview = tracker.switchTab("settings", 0);
  assert.equal(restoreOverview, 0);

  // Switch to overview from settings (currently at 650px)
  const restoredForOverview = tracker.switchTab("overview", 650);
  assert.equal(restoredForOverview, 0);
  assert.equal(tracker.getPosition("settings"), 650);

  // Switch back to settings from overview (currently at 120px)
  const restoredForSettings = tracker.switchTab("settings", 120);
  assert.equal(restoredForSettings, 650);
  assert.equal(tracker.getPosition("overview"), 120);
});
