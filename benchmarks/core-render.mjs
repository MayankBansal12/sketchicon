import { performance } from "node:perf_hooks";

import { renderSketch } from "../packages/core/dist/index.js";
import hugeiconsAiBrain from "../packages/hugeicons/dist/icons/ai-brain-01.js";
import lucideStar from "../packages/lucide/dist/icons/star.js";

const samples = readPositiveInteger("BENCH_SAMPLES", 7);
const iterations = readPositiveInteger("BENCH_ITERATIONS", 1_000);
const variants = [
  { roughness: 0.35, seed: 1 },
  { roughness: 0.8, seed: 17 },
  { roughness: 1.5, seed: 0 },
  { roughness: 2, seed: 2_147_483_647 },
];

function readPositiveInteger(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function measure(label, operations, callback) {
  let checksum = 0;
  const durations = [];

  for (let sample = 0; sample < samples + 1; sample += 1) {
    const start = performance.now();
    for (let index = 0; index < operations; index += 1) {
      checksum += callback(index);
    }
    const duration = performance.now() - start;
    if (sample > 0) durations.push(duration);
  }

  const duration = median(durations);
  const microseconds = duration * 1_000 / operations;
  console.log(`${label.padEnd(36)} ${microseconds.toFixed(2).padStart(9)} us/op`);
  return { microseconds, checksum };
}

function benchmarkGeometry(label, geometry) {
  const render = measure(`${label}: render variants`, iterations, (index) => {
    const paths = renderSketch(geometry, variants[index % variants.length]);
    return paths.length + (paths[0]?.d.length ?? 0);
  });
  const signature = measure(
    `${label}: JSON signature`,
    iterations * 20,
    () => JSON.stringify(geometry.primitives).length,
  );

  console.log(
    `${`${label}: render/signature`.padEnd(36)} ${(render.microseconds / signature.microseconds).toFixed(1).padStart(9)} x`,
  );
  return render.checksum + signature.checksum;
}

console.log(`core render benchmark (${samples} samples, median; ${iterations} render ops)`);
const checksum = benchmarkGeometry("Lucide Star", lucideStar)
  + benchmarkGeometry("Hugeicons Ai Brain 01", hugeiconsAiBrain);
console.log(`checksum ${checksum}`);
