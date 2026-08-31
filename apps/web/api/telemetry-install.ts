import { createHash } from "node:crypto";
import { put } from "@vercel/blob";

const allowedPacks = new Set(["lucide", "hugeicons"]);
const powPrefix = "0000";
const maxBodyBytes = 1024;

function challengeForPayload(packs: string[], version: string, migrated: boolean, ts: number): string {
  return `sketchicon:${JSON.stringify([packs, version, migrated, ts])}`;
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
      const chunks: Buffer[] = [];
      let receivedBytes = 0;
      for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        receivedBytes += buffer.byteLength;
        if (receivedBytes > maxBodyBytes) {
          res.status(413).json({ error: "payload too large" });
          return;
        }
        chunks.push(buffer);
      }
      raw = Buffer.concat(chunks).toString("utf8");
    }
  } catch {
    res.status(400).json({ error: "invalid body" });
    return;
  }

  const rawBytes = Buffer.byteLength(raw, "utf8");
  if (rawBytes > maxBodyBytes || rawBytes === 0) {
    if (rawBytes > maxBodyBytes) {
      res.status(413).json({ error: "payload too large" });
      return;
    }
    if (rawBytes === 0) {
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

  if (
    !Array.isArray(packs)
    || packs.length === 0
    || !packs.every((p: unknown) => typeof p === "string" && allowedPacks.has(p as string))
  ) {
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
  if (typeof ts !== "number" || !Number.isSafeInteger(ts)) {
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

  const challenge = challengeForPayload(packs, version, migrated, ts);
  const digest = proofOfWorkDigest(challenge, nonce);
  if (!digest.startsWith(powPrefix)) {
    res.status(400).json({ error: "invalid proof" });
    return;
  }

  const day = new Date(ts).toISOString().slice(0, 10);
  // The exact timestamp and proof are used only for freshness and replay
  // protection. Persist only the anonymous product metrics we disclose.
  const blobBody = JSON.stringify({ packs, version, migrated });
  const eventId = createHash("sha256")
    .update(challenge)
    .digest("hex");
  const key = `installs/${day}/${eventId}.json`;

  try {
    await put(key, blobBody, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      allowOverwrite: true,
    });
  } catch (error) {
    // If Blob is not configured, don't leak internals – treat as server error
    res.status(500).json({ error: "store unavailable" });
    return;
  }

  res.status(204).end();
}
