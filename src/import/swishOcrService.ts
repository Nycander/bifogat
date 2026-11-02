/**
 * Image preprocessing and lazy on-device OCR for Swish screenshots using Tesseract.js.
 * - Crops avatar column (left ~12%) to remove profile pictures and icons.
 * - Theme-agnostic background detection: calculates pixel distance from most common background
 *   color and converts to high-contrast dark ink on pure white.
 * - Lazy-loads tesseract.js worker so main bundle remains compact.
 * - Runs 100% on-device; no data leaves the browser.
 */

export interface PreprocessOptions {
  avatarCropRatio?: number; // default 0.12 (crop left 12%)
  contrastThreshold?: number; // default 28
}

/**
 * Samples pixel colors to identify the dominant background color.
 */
export function detectBackgroundColor(ctx: CanvasRenderingContext2D, width: number, height: number): [number, number, number] {
  const sampleData = ctx.getImageData(0, 0, width, Math.min(height, 80)).data;
  const colorBuckets = new Map<string, { count: number; rgb: [number, number, number] }>();

  // Sample every 4th pixel across header / top region
  for (let i = 0; i < sampleData.length; i += 16) {
    // Quantize into 16-step bins
    const r = Math.round(sampleData[i] / 16) * 16;
    const g = Math.round(sampleData[i + 1] / 16) * 16;
    const b = Math.round(sampleData[i + 2] / 16) * 16;
    const key = `${r},${g},${b}`;

    const existing = colorBuckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      colorBuckets.set(key, { count: 1, rgb: [sampleData[i], sampleData[i + 1], sampleData[i + 2]] });
    }
  }

  let dominant: [number, number, number] = [20, 20, 20];
  let maxCount = -1;
  for (const bucket of colorBuckets.values()) {
    if (bucket.count > maxCount) {
      maxCount = bucket.count;
      dominant = bucket.rgb;
    }
  }

  return dominant;
}

/**
 * Preprocesses a Swish screenshot for OCR:
 * 1. Crops avatar column on the left
 * 2. Inverts/normalizes ink to crisp black on white
 */
export function preprocessSwishCanvas(
  sourceCanvas: HTMLCanvasElement,
  options?: PreprocessOptions,
): HTMLCanvasElement {
  const avatarCropRatio = options?.avatarCropRatio ?? 0.12;
  const threshold = options?.contrastThreshold ?? 28;

  const srcWidth = sourceCanvas.width;
  const srcHeight = sourceCanvas.height;

  const cropX = Math.round(srcWidth * avatarCropRatio);
  const targetWidth = srcWidth - cropX;
  const targetHeight = srcHeight;

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = targetWidth;
  outputCanvas.height = targetHeight;

  const outCtx = outputCanvas.getContext("2d", { willReadFrequently: true });
  if (!outCtx) return sourceCanvas;

  // Draw cropped image
  outCtx.drawImage(
    sourceCanvas,
    cropX,
    0,
    targetWidth,
    targetHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  const imgData = outCtx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imgData.data;

  // Detect dominant background color from the cropped area
  const [bgR, bgG, bgB] = detectBackgroundColor(outCtx, targetWidth, targetHeight);

  // Binarize: text vs background
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dist = Math.max(Math.abs(r - bgR), Math.abs(g - bgG), Math.abs(b - bgB));

    if (dist < threshold) {
      // Background -> pure white
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    } else {
      // Text / ink -> pure black
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    }
  }

  outCtx.putImageData(imgData, 0, 0);
  return outputCanvas;
}

/**
 * Loads an image file or blob into an HTMLCanvasElement.
 */
export async function loadImageToCanvas(file: File | Blob): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas 2d context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Kunde inte läsa in bildfilen"));
    };

    img.src = url;
  });
}

/**
 * Runs OCR on a Swish screenshot with Swedish language model.
 * Dynamically imports tesseract.js to avoid bloating main bundle.
 */
export async function recognizeSwishScreenshot(
  file: File | Blob,
  onProgress?: (progress: number, status: string) => void,
): Promise<string> {
  onProgress?.(0.05, "Förbereder bild...");
  const rawCanvas = await loadImageToCanvas(file);

  onProgress?.(0.15, "Optimerar kontrast och beskärning...");
  const preprocessedCanvas = preprocessSwishCanvas(rawCanvas);

  onProgress?.(0.25, "Laddar textigenkänning (svenska)...");
  // Lazy import of tesseract.js
  const { createWorker } = await import("tesseract.js");

  const worker = await createWorker("swe", 1, {
    logger: (m) => {
      if (m.status === "recognizing text") {
        const ocrProgress = 0.3 + (m.progress || 0) * 0.65;
        onProgress?.(ocrProgress, "Läser av Swish-rader...");
      } else if (m.status) {
        onProgress?.(0.25, `Initierar (${m.status})...`);
      }
    },
  });

  onProgress?.(0.3, "Analyserar skärmdump...");
  const result = await worker.recognize(preprocessedCanvas);
  await worker.terminate();

  onProgress?.(1.0, "Klar!");
  return result.data.text || "";
}
