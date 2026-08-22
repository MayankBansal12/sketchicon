import { createHash, randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

const allowedPacks = new Set(["lucide", "hugeicons"]);
const powPrefix = "0000";
const maxBodyBytes = 1024;

function challengeForDate(date: Date): string {
  return `sketchicon:${date.toISOString().slice(0, 10)}`;
}

function proofOfWorkDigest(challenge: string, nonce: string): string {
  return createHash("sha256").update(`${challenge}:${nonce}`).digest("hex");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const contentLength = Number(req.headers?.["content-length"] ?? 0);
  if (contentLength > maxBodyBytes) {
    res.status(413).json({ error: "payload too large" });
    return;
  }

  let raw = "";
  try {
    if (req.body !== undefined && req.body !== null) {
      // Vercel may have already parsed JSON bodies.
      if (typeof req.body === "string") raw = req.body;
      else if (Buffer.isBuffer(req.body)) raw = req.body.toString("utf8");
      else raw = JSON.stringify(req.body);
    } else {
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > maxBodyBytes) {
          res.status(413).json({ error: "payload too large" });
          return;
        }
      }
    }
  } catch {
    res.status(400).json({ error: "invalid body" });
    return;
  }

  if (raw.length > maxBodyBytes || raw.length === 0) {
    if (raw.length > maxBodyBytes) {
      res.status(413).json({ error: "payload too large" });
      return;
    }
    if (raw.length === 0) {
      res.status(400).json({ error: "missing body" });
      return;
    }
  }

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    res.status(400).json({ error: "invalid json" });
    return;
  }

  const { packs, version, migrated, ts, nonce } = data ?? {};

  if (!Array.isArray(packs) || !packs.every((p: unknown) => typeof p === "string" && allowedPacks.has(p as string))) {
    res.status(400).json({ error: "invalid packs" });
    return;
  }
  if (new Set(packs).size !== packs.length) {
    res.status(400).json({ error: "duplicate packs" });
    return;
  }
  if (typeof version !== "string" || version.length === 0 || version.length > 20) {
    res.status(400).json({ error: "invalid version" });
    return;
  }
  if (typeof migrated !== "boolean") {
    res.status(400).json({ error: "invalid migrated" });
    return;
  }
  if (typeof ts !== "number" || !Number.isFinite(ts)) {
    res.status(400).json({ error: "invalid ts" });
    return;
  }
  if (typeof nonce !== "string" || nonce.length === 0 || nonce.length > 64) {
    res.status(400).json({ error: "invalid nonce" });
    return;
  }

  // Freshness check: within 48h to allow slight clock skew
  const now = Date.now();
  if (Math.abs(now - ts) > 48 * 60 * 60 * 1000) {
    res.status(400).json({ error: "stale ts" });
    return;
  }

  const challenge = challengeForDate(new Date(ts));
  const digest = proofOfWorkDigest(challenge, nonce);
  if (!digest.startsWith(powPrefix)) {
    res.status(400).json({ error: "invalid proof" });
    return;
  }

  const day = new Date(ts).toISOString().slice(0, 10);
  const key = `installs/${day}/${randomUUID()}.json`;
  const blobBody = JSON.stringify({ packs, version, migrated, ts });

  try {
    await put(key, blobBody, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
  } catch (error) {
    // If Blob is not configured, don't leak internals – treat as server error
    res.status(500).json({ error: "store unavailable" });
    return;
  }

  res.status(204).end();
}
