import { describe, expect, it, vi } from "vitest";

import {
  challengeForDate,
  isTelemetryAllowed,
  powDifficultyPrefix,
  proofOfWorkDigest,
  sendInstallTelemetry,
  solveProofOfWork,
} from "./telemetry.js";

describe("telemetry", () => {
  it("respects every opt-out", () => {
    expect(isTelemetryAllowed({}, false)).toBe(true);
    expect(isTelemetryAllowed({ CI: "1" }, false)).toBe(false);
    expect(isTelemetryAllowed({ CI: "true" }, false)).toBe(false);
    expect(isTelemetryAllowed({ DO_NOT_TRACK: "1" }, false)).toBe(false);
    expect(isTelemetryAllowed({ SKETCHICON_NO_TELEMETRY: "1" }, false)).toBe(false);
    expect(isTelemetryAllowed({ CI: "0" }, true)).toBe(false);
    expect(isTelemetryAllowed({ CI: "0" }, false)).toBe(true);
  });

  it("solves proofs of work that meet the difficulty prefix", () => {
    const challenge = challengeForDate(new Date("2026-08-22T00:00:00Z"));
    const nonce = solveProofOfWork(challenge);
    expect(proofOfWorkDigest(challenge, nonce).startsWith(powDifficultyPrefix)).toBe(true);
    expect(proofOfWorkDigest(challenge, `${nonce}x`).startsWith(powDifficultyPrefix)).toBe(false);
  });

  it("posts a signed install event when allowed", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    await sendInstallTelemetry(
      { migrated: true, packs: ["lucide"], version: "0.2.0" },
      { env: {}, fetchImpl },
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/telemetry-install");
    expect(init.method).toBe("POST");
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(payload).toMatchObject({ migrated: true, packs: ["lucide"], version: "0.2.0" });
    expect(typeof payload.ts).toBe("number");
    expect(typeof payload.nonce).toBe("string");
  });

  it("never sends when opted out", async () => {
    const fetchImpl = vi.fn();
    await sendInstallTelemetry(
      { migrated: false, packs: ["hugeicons"], version: "0.2.0" },
      { env: { CI: "1" }, fetchImpl },
    );
    await sendInstallTelemetry(
      { migrated: false, packs: [], version: "0.2.0" },
      { env: {}, fetchImpl, noTelemetry: true },
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("swallows network failures", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(
      sendInstallTelemetry(
        { migrated: false, packs: ["lucide"], version: "0.2.0" },
        { env: {}, fetchImpl },
      ),
    ).resolves.toBeUndefined();
  });
});
