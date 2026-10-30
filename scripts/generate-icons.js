import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { Resvg } from "@resvg/resvg-js";

const publicDir = path.resolve("public");
const iconSvgPath = path.join(publicDir, "icon.svg");

if (!fs.existsSync(iconSvgPath)) {
  console.error("icon.svg not found in public directory!");
  process.exit(1);
}

const svgContent = fs.readFileSync(iconSvgPath, "utf-8");

// Standard icon SVG (with squircle background matching sage palette)
const standardSvg = svgContent;

// Maskable & Apple Touch icon SVG (full bleed background, no rounded squircle corners, so OS adaptive mask applies cleanly)
const fullBleedSvg = svgContent
  .replace(
    '<rect width="512" height="512" rx="112" fill="url(#bgGrad)" />',
    '<rect width="512" height="512" fill="url(#bgGrad)" />'
  )
  .replace(
    '<rect width="504" height="504" x="4" y="4" rx="108" fill="none" stroke="#f1f3e0" stroke-width="4" stroke-opacity="0.45" />',
    ""
  );

function renderPng(svg, width) {
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: width,
    },
    shapeRendering: 2, // geometricPrecision
    textRendering: 1, // optimizeLegibility
    imageRendering: 0, // optimizeQuality
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

console.log("Generating PWA icons and favicons...");

// 1. pwa-512x512.png (purpose: any)
const pwa512 = renderPng(standardSvg, 512, 512);
fs.writeFileSync(path.join(publicDir, "pwa-512x512.png"), pwa512);
fs.writeFileSync(path.join(publicDir, "pwa-512x512-v2.png"), pwa512);
console.log("✓ Generated public/pwa-512x512.png & pwa-512x512-v2.png (512x512, any)");

// 2. pwa-192x192.png (purpose: any)
const pwa192 = renderPng(standardSvg, 192, 192);
fs.writeFileSync(path.join(publicDir, "pwa-192x192.png"), pwa192);
fs.writeFileSync(path.join(publicDir, "pwa-192x192-v2.png"), pwa192);
console.log("✓ Generated public/pwa-192x192.png & pwa-192x192-v2.png (192x192, any)");

// 3. pwa-maskable-512x512.png (purpose: maskable, full bleed)
const pwaMaskable = renderPng(fullBleedSvg, 512, 512);
fs.writeFileSync(path.join(publicDir, "pwa-maskable-512x512.png"), pwaMaskable);
fs.writeFileSync(path.join(publicDir, "pwa-maskable-512x512-v2.png"), pwaMaskable);
console.log("✓ Generated public/pwa-maskable-512x512.png & pwa-maskable-512x512-v2.png (512x512, maskable)");

// 4. apple-touch-icon.png (180x180, full bleed for iOS)
const appleTouch = renderPng(fullBleedSvg, 180, 180);
fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), appleTouch);
fs.writeFileSync(path.join(publicDir, "apple-touch-icon-v2.png"), appleTouch);
console.log("✓ Generated public/apple-touch-icon.png & apple-touch-icon-v2.png (180x180, iOS)");

// 5. icon-v2.svg copy
fs.writeFileSync(path.join(publicDir, "icon-v2.svg"), standardSvg);
console.log("✓ Generated public/icon-v2.svg");

// 6. favicon-32x32.png and favicon-16x16.png
const fav32 = renderPng(standardSvg, 32, 32);
const fav16 = renderPng(standardSvg, 16, 16);
fs.writeFileSync(path.join(publicDir, "favicon-32x32.png"), fav32);
fs.writeFileSync(path.join(publicDir, "favicon-16x16.png"), fav16);
console.log("✓ Generated public/favicon-32x32.png & favicon-16x16.png");

// 7. favicon.ico
try {
  execSync(`convert ${path.join(publicDir, "favicon-32x32.png")} ${path.join(publicDir, "favicon.ico")}`);
  console.log("✓ Generated public/favicon.ico");
} catch (e) {
  console.warn("Could not run convert to create favicon.ico, skipping ico conversion:", e.message);
}

console.log("All PWA icons and favicons generated successfully!");

