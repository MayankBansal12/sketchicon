#!/usr/bin/env node
// Stats viewer for anonymous install telemetry stored in Vercel Blob.
// Usage:
//   BLOB_READ_WRITE_TOKEN=... node scripts/telemetry-tally.mjs
//   BLOB_READ_WRITE_TOKEN=... node scripts/telemetry-tally.mjs --since 2026-08-01 --json
//
// Reads blobs under installs/YYYY-MM-DD/*.json via @vercel/blob list(),
// fetches each JSON, and tallies packs / versions / migrated.

import { list } from "@vercel/blob";

const args = process.argv.slice(2);
let sinceArg;
let jsonFlag = false;

for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === "--json") {
    jsonFlag = true;
    continue;
  }

  if (argument === "--since" || argument?.startsWith("--since=")) {
    if (sinceArg !== undefined) {
      console.error("--since may only be provided once");
      process.exit(1);
    }

    sinceArg = argument === "--since" ? args[++index] : argument.slice("--since=".length);
    if (!sinceArg || sinceArg.startsWith("--")) {
      console.error("--since requires a date in YYYY-MM-DD format");
      process.exit(1);
    }
    continue;
  }

  console.error(`Unknown argument: ${argument}`);
  process.exit(1);
}

const since = sinceArg ? new Date(sinceArg) : null;
if (
  sinceArg
  && since
  && (
    !/^\d{4}-\d{2}-\d{2}$/.test(sinceArg)
    || Number.isNaN(since.getTime())
    || since.toISOString().slice(0, 10) !== sinceArg
  )
) {
  console.error(`Invalid --since date: ${sinceArg} (use YYYY-MM-DD)`);
  process.exit(1);
}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Missing BLOB_READ_WRITE_TOKEN. Run: vercel env pull .env.local && node scripts/telemetry-tally.mjs");
  process.exit(1);
}

let cursor;
let total = 0;
const byDay = new Map();
const byPack = new Map();
const byVersion = new Map();
let migratedCount = 0;
const errors = [];

do {
  const result = await list({ prefix: "installs/", cursor, limit: 1000 });
  const blobs = result.blobs.filter((b) => b.pathname.endsWith(".json"));

  for (const blob of blobs) {
    // blob.pathname is like installs/2026-08-22/<event-hash>.json
    const day = blob.pathname.split("/")[1];
    if (since && day && day < since.toISOString().slice(0, 10)) continue;

    try {
      const res = await fetch(blob.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // data: { packs, version, migrated }

      total += 1;
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
      if (data.migrated) migratedCount += 1;
      if (typeof data.version === "string") {
        byVersion.set(data.version, (byVersion.get(data.version) ?? 0) + 1);
      }
      if (Array.isArray(data.packs)) {
        for (const p of data.packs) {
          byPack.set(p, (byPack.get(p) ?? 0) + 1);
        }
        // combo key
        const combo = [...data.packs].sort().join("+") || "(none)";
        byPack.set(`combo:${combo}`, (byPack.get(`combo:${combo}`) ?? 0) + 1);
      }
    } catch (error) {
      errors.push(`${blob.pathname}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  cursor = result.cursor;
} while (cursor);

const result = {
  total,
  migrated: migratedCount,
  byDay: Object.fromEntries([...byDay.entries()].sort()),
  byPack: Object.fromEntries([...byPack.entries()].sort()),
  byVersion: Object.fromEntries([...byVersion.entries()].sort()),
  errors: errors.slice(0, 20),
};

if (jsonFlag) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`\nSketchIcon installs — ${total} events${since ? ` since ${since.toISOString().slice(0,10)}` : ""}\n`);
  console.log(`Total:    ${total}`);
  console.log(`Migrated: ${migratedCount} (${total ? Math.round((migratedCount/total)*100) : 0}%)`);
  console.log("\nBy day:");
  for (const [day, count] of [...byDay.entries()].sort()) {
    console.log(`  ${day}  ${count}`);
  }
  console.log("\nBy pack:");
  for (const [pack, count] of [...byPack.entries()].sort()) {
    if (pack.startsWith("combo:")) continue;
    console.log(`  ${pack.padEnd(12)} ${count}`);
  }
  console.log("\nBy combo:");
  for (const [k, count] of [...byPack.entries()].sort()) {
    if (!k.startsWith("combo:")) continue;
    console.log(`  ${k.slice(6).padEnd(20)} ${count}`);
  }
  console.log("\nBy version:");
  for (const [v, count] of [...byVersion.entries()].sort()) {
    console.log(`  ${v.padEnd(12)} ${count}`);
  }
  if (errors.length) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors.slice(0, 10)) console.log(`  ${e}`);
  }
  console.log();
}

if (total === 0) {
  console.log("No data yet. Check that BLOB_READ_WRITE_TOKEN matches the Vercel Blob store linked to sketchicon-web.");
}
