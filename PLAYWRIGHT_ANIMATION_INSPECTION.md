# PLAYWRIGHT_ANIMATION_INSPECTION.md — Visual & Animation Testing in Bifogat 📹

This document outlines the methodology for recording and inspecting animations, micro-interactions, and layout changes frame-by-frame using Playwright in **Bifogat**.

---

## 1. When to Use Visual Playwright Inspection

Use this methodology when developing or modifying:
1. **Slide/Fade Tab Transitions**: Two-way synchronized slide navigation between views/tabs.
2. **Bottom Sheet & Gestures**: Drag-to-dismiss behaviors (drag handle, upward drag resistance, dismissal threshold tuning).
3. **Software Keyboard & Modal Layouts**: Verifying that input fields and quick chips remain visible when the mobile keyboard opens.
4. **Particle Sweeps & Flight Physics**: Bee trajectory parameters, loops, dances, and orientation turns.

---

## 2. Recording & Frame-by-Frame Workflow

### Step 1: Start Video Recording
Specify an artifact output file in `.aistudio/artifacts/computer_use/`:

```bash
npx playwright-cli video-start /.aistudio/artifacts/computer_use/animation_inspection.webm
```

### Step 2: Perform the Interaction with Precise Timing

```bash
npx playwright-cli run-code "async (page) => {
  await page.setViewportSize({ width: 392, height: 800 });
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(300);

  // Example: Click tab or open modal
  await page.locator('.bottom-nav-btn:has-text(\"Kupor\")').click();
  await page.waitForTimeout(400);
}"
```

### Step 3: Stop Video Recording & Inspect Geometry
Stop the video recording and evaluate DOM bounding rectangles:

```bash
npx playwright-cli video-stop
```

### Step 4: Quantitative Evaluation Checklist
Check and report the following factors:
- **C1 Continuity / Pop Artifacts**: Are there any sudden jumps in `translateY`, `opacity`, or `height` between adjacent frames?
- **Keyboard Obstruction**: Is the bottom coordinate of the input field (`rect.bottom`) less than `window.innerHeight` when the keyboard is active?
- **FPS & Responsiveness**: Does the animation complete within 350 ms and initiate within 16 ms of user interaction?

---

## 3. Example Script for Keyboard & Modal Geometry Inspection

Use this pattern to test modal layout behavior under an active software keyboard:

```javascript
const result = await page.evaluate(() => {
  const input = document.getElementById('event-single-notes');
  const modal = document.querySelector('.modal-content');
  const inputRect = input ? input.getBoundingClientRect() : null;
  const modalRect = modal ? modal.getBoundingClientRect() : null;
  return {
    windowHeight: window.innerHeight,
    inputRect,
    modalRect,
    inputVisible: inputRect ? (inputRect.top >= 0 && inputRect.bottom <= window.innerHeight) : false
  };
});
```
