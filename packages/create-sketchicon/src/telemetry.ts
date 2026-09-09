import { createHash } from "node:crypto";

import type { IconPack } from "./lib.js";

export const DEFAULT_TELEMETRY_URL = "https://sketchicon.com/api/telemetry-install";
export const powDifficultyPrefix = "0000";

export interface InstallTelemetryPayload {
  packs: IconPack[];
  version: string;
  migrated: boolean;
}

export interface SendTelemetryOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  noTelemetry?: boolean;
}

function isTruthyEnvValue(value: string | undefined): boolean {
  if (value === undefined) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== "" && normalized !== "0" && normalized !== "false";
}

export function isTelemetryAllowed(
  env: Record<string, string | undefined>,
  noTelemetry: boolean,
): boolean {
  if (noTelemetry) return false;
  if (isTruthyEnvValue(env.CI)) return false;
  if (isTruthyEnvValue(env.DO_NOT_TRACK)) return false;
  if (isTruthyEnvValue(env.SKETCHICON_NO_TELEMETRY)) return false;
  return true;
}

export function challengeForPayload(payload: InstallTelemetryPayload, ts: number): string {
  return `sketchicon:${JSON.stringify([payload.packs, payload.version, payload.migrated, ts])}`;
}

export function proofOfWorkDigest(challenge: string, nonce: string): string {
  return createHash("sha256").update(`${challenge}:${nonce}`).digest("hex");
}

export function solveProofOfWork(challenge: string): string {
  let nonce = 0;
  while (true) {
    const candidate = String(nonce);
    if (proofOfWorkDigest(challenge, candidate).startsWith(powDifficultyPrefix)) {
      return candidate;
    }
    nonce += 1;
  }
}

export async function sendInstallTelemetry(
  payload: InstallTelemetryPayload,
  options: SendTelemetryOptions = {},
): Promise<void> {
  const env = options.env ?? process.env;
  const noTelemetry = options.noTelemetry ?? false;

  if (!isTelemetryAllowed(env, noTelemetry)) return;

  try {
    const ts = Date.now();
    const challenge = challengeForPayload(payload, ts);
    const nonce = solveProofOfWork(challenge);

    const body = JSON.stringify({
      packs: payload.packs,
      version: payload.version,
      migrated: payload.migrated,
      ts,
      nonce,
    });

    const fetchImpl = options.fetchImpl ?? fetch;
    const telemetryUrl = env.SKETCHICON_TELEMETRY_URL?.trim() || DEFAULT_TELEMETRY_URL;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    try {
      await fetchImpl(telemetryUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Telemetry must never fail the install.
  }
}
