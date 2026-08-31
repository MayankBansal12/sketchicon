import { createHash } from "node:crypto";

import { put } from "@vercel/blob";
import { beforeEach, describe, expect, it, vi } from "vitest";

import handler from "../api/telemetry-install.js";

vi.mock("@vercel/blob", () => ({
  put: vi.fn(async () => ({ url: "https://example.test/event.json" })),
}));

const mockedPut = vi.mocked(put);

function proofOfWorkDigest(challenge: string, nonce: string): string {
  return createHash("sha256").update(`${challenge}:${nonce}`).digest("hex");
}

function solveProof(
  payload: { packs: string[]; version: string; migrated: boolean; ts: number },
  start = 0,
): string {
  const challenge = `sketchicon:${JSON.stringify([payload.packs, payload.version, payload.migrated, payload.ts])}`;
  for (let nonce = start; ; nonce += 1) {
    if (proofOfWorkDigest(challenge, String(nonce)).startsWith("0000")) return String(nonce);
  }
}

function responseMock() {
  return {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json: vi.fn(),
    end: vi.fn(),
  };
}

describe("install telemetry receiver", () => {
  beforeEach(() => {
    mockedPut.mockClear();
  });

  it("uses a stable overwrite key for exact replays", async () => {
    const event = { packs: ["lucide"], version: "0.2.0", migrated: false, ts: Date.now() };
    const nonce = solveProof(event);
    const secondNonce = solveProof(event, Number(nonce) + 1);
    const req = { method: "POST", headers: {}, body: { ...event, nonce } };

    const firstResponse = responseMock();
    const replayResponse = responseMock();
    await handler(req, firstResponse);
    await handler({ ...req, body: { ...event, nonce: secondNonce } }, replayResponse);

    expect(firstResponse.statusCode).toBe(204);
    expect(firstResponse.end).toHaveBeenCalledOnce();
    expect(replayResponse.end).toHaveBeenCalledOnce();
    expect(mockedPut).toHaveBeenCalledTimes(2);
    expect(mockedPut.mock.calls[0]?.[0]).toBe(mockedPut.mock.calls[1]?.[0]);
    expect(mockedPut.mock.calls[0]?.[2]).toMatchObject({ addRandomSuffix: false, allowOverwrite: true });
    expect(mockedPut.mock.calls[0]?.[1]).toBe(JSON.stringify({
      packs: event.packs,
      version: event.version,
      migrated: event.migrated,
    }));
  });

  it("rejects reusing a proof with altered event data", async () => {
    const event = { packs: ["hugeicons"], version: "0.2.0", migrated: false, ts: Date.now() };
    const nonce = solveProof(event);
    const res = responseMock();

    await handler(
      { method: "POST", headers: {}, body: { ...event, migrated: true, nonce } },
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.json).toHaveBeenCalledWith({ error: "invalid proof" });
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it("rejects empty pack selections", async () => {
    const event = { packs: [] as string[], version: "0.2.0", migrated: false, ts: Date.now() };
    const res = responseMock();

    await handler(
      { method: "POST", headers: {}, body: { ...event, nonce: solveProof(event) } },
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.json).toHaveBeenCalledWith({ error: "invalid packs" });
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it("measures the body limit in UTF-8 bytes", async () => {
    const res = responseMock();

    await handler(
      { method: "POST", headers: {}, body: `{"version":"${"é".repeat(600)}"}` },
      res,
    );

    expect(res.statusCode).toBe(413);
    expect(res.json).toHaveBeenCalledWith({ error: "payload too large" });
    expect(mockedPut).not.toHaveBeenCalled();
  });
});
