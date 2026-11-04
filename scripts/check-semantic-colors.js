import fs from "node:fs";
import path from "node:path";

const SRC_DIR = path.resolve("src");

// Files or directories allowed to contain raw hex/RGB values
const EXEMPT_PATTERNS = [
  /\.css$/,
  /src[\\/]domain[\\/]honeyCostBreakdown\.ts$/, // domain fallback shade colors
  /src[\\/]components[\\/]Logo\.tsx$/, // brand logo SVG vector paths
  /src[\\/]theme[\\/]useTheme\.ts$/, // browser meta theme-color tag
  /\.test\.ts$/,
];

const HARDCODED_HEX_REGEX = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
const HARDCODED_RGB_REGEX = /rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g;

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else if (/\.(tsx?|jsx?)$/.test(filePath)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

let violations = [];
const allFiles = walkDir(SRC_DIR);

for (const filePath of allFiles) {
  const relativePath = path.relative(process.cwd(), filePath);
  if (EXEMPT_PATTERNS.some((pattern) => pattern.test(relativePath))) {
    continue;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    // Ignore comments and SVG illustration vector graphics/paths (e.g., Google logo, bee illustration paths)
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("<stop") ||
      trimmed.startsWith("<polygon") ||
      trimmed.startsWith("<ellipse") ||
      trimmed.startsWith("<circle") ||
      trimmed.startsWith("<path") ||
      trimmed.startsWith("<line") ||
      trimmed.startsWith("<rect") ||
      trimmed.startsWith("fill=") ||
      trimmed.startsWith("stroke=") ||
      line.includes("drop-shadow(")
    ) {
      return;
    }

    // Check for hardcoded hex colors
    const hexMatches = line.match(HARDCODED_HEX_REGEX);
    if (hexMatches) {
      for (const match of hexMatches) {
        if (!line.includes("var(") && !line.includes("data:image/svg+xml")) {
          violations.push({
            file: relativePath,
            line: index + 1,
            match,
            code: line.trim(),
          });
        }
      }
    }

    // Check for hardcoded rgb/rgba colors
    const rgbMatches = line.match(HARDCODED_RGB_REGEX);
    if (rgbMatches) {
      for (const match of rgbMatches) {
        if (!line.includes("var(") && !line.includes("data:image/svg+xml")) {
          violations.push({
            file: relativePath,
            line: index + 1,
            match,
            code: line.trim(),
          });
        }
      }
    }
  });
}

if (violations.length > 0) {
  console.error("\n❌ Found hardcoded color literals that violate semantic CSS rule:\n");
  violations.forEach((v) => {
    console.error(`  ${v.file}:${v.line} -> "${v.match}" in: ${v.code}`);
  });
  console.error(
    "\n--> Please replace hardcoded hex/RGB colors with semantic CSS variables (e.g. var(--color-...)).\n"
  );
  process.exit(1);
} else {
  console.log("✓ All UI components pass semantic color check! Zero hardcoded hex/RGB colors found.");
}
