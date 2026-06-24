import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { PNG } from "pngjs";

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error("Usage: npm run check:screenshot -- <image.png> [more.png]");
  process.exit(1);
}

let failed = false;

for (const file of files) {
  const png = PNG.sync.read(readFileSync(file));
  let dark = 0;
  let bright = 0;
  let sum = 0;
  let sumSq = 0;
  let sampled = 0;

  for (let y = 0; y < png.height; y += 2) {
    for (let x = 0; x < png.width; x += 2) {
      const i = (png.width * y + x) * 4;
      const alpha = png.data[i + 3];
      if (alpha < 200) continue;
      const luma = 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
      if (luma < 18) dark += 1;
      if (luma > 238) bright += 1;
      sum += luma;
      sumSq += luma * luma;
      sampled += 1;
    }
  }

  const mean = sampled ? sum / sampled : 0;
  const variance = sampled ? sumSq / sampled - mean * mean : 0;
  const stdev = Math.sqrt(Math.max(variance, 0));
  const darkRatio = sampled ? dark / sampled : 1;
  const brightRatio = sampled ? bright / sampled : 1;
  const ok = sampled > 0 && mean > 24 && mean < 225 && stdev > 10 && darkRatio < 0.72 && brightRatio < 0.92;

  console.log(
    `${basename(file)} mean=${mean.toFixed(1)} stdev=${stdev.toFixed(1)} dark=${(darkRatio * 100).toFixed(1)}% bright=${(brightRatio * 100).toFixed(1)}% ${ok ? "ok" : "fail"}`,
  );

  if (!ok) failed = true;
}

if (failed) process.exit(1);
