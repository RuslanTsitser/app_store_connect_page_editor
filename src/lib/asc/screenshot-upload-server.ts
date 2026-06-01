import { createHash } from "crypto";
import type { AscCredentials } from "./types";
import { ascServerFetch } from "./server-client";

type UploadOperation = {
  method: string;
  url: string;
  length: number;
  offset: number;
  requestHeaders?: { name: string; value: string }[];
};

type ReserveResponse = {
  data?: {
    id: string;
    attributes?: {
      uploadOperations?: UploadOperation[];
    };
  };
};

function md5Hex(buffer: Buffer): string {
  return createHash("md5").update(buffer).digest("hex");
}

async function uploadChunks(
  buffer: Buffer,
  operations: UploadOperation[],
): Promise<void> {
  for (const op of operations) {
    const chunk = buffer.subarray(op.offset, op.offset + op.length);
    const headers: Record<string, string> = {};
    for (const h of op.requestHeaders ?? []) {
      headers[h.name] = h.value;
    }

    const res = await fetch(op.url, {
      method: op.method,
      headers,
      body: new Uint8Array(chunk),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `File upload failed (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
      );
    }
  }
}

export async function uploadScreenshotToSet(
  credentials: AscCredentials,
  setId: string,
  fileName: string,
  buffer: Buffer,
): Promise<{ id: string }> {
  const reserveRes = await ascServerFetch(credentials, "appScreenshots", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "appScreenshots",
        attributes: {
          fileName,
          fileSize: buffer.length,
        },
        relationships: {
          appScreenshotSet: {
            data: { type: "appScreenshotSets", id: setId },
          },
        },
      },
    }),
  });

  const reserveText = await reserveRes.text();
  if (!reserveRes.ok) {
    throw new Error(parseAscError(reserveText, reserveRes.status));
  }

  const reserve = JSON.parse(reserveText) as ReserveResponse;
  const screenshotId = reserve.data?.id;
  const operations = reserve.data?.attributes?.uploadOperations;

  if (!screenshotId) {
    throw new Error("ASC did not return a screenshot id");
  }
  if (!operations?.length) {
    throw new Error("ASC did not return uploadOperations");
  }

  await uploadChunks(buffer, operations);

  const checksum = md5Hex(buffer);
  const commitRes = await ascServerFetch(
    credentials,
    `appScreenshots/${screenshotId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        data: {
          type: "appScreenshots",
          id: screenshotId,
          attributes: {
            uploaded: true,
            sourceFileChecksum: checksum,
          },
        },
      }),
    },
  );

  const commitText = await commitRes.text();
  if (!commitRes.ok) {
    throw new Error(parseAscError(commitText, commitRes.status));
  }

  return { id: screenshotId };
}

function parseAscError(text: string, status: number): string {
  try {
    const data = JSON.parse(text) as {
      errors?: { detail?: string; title?: string }[];
    };
    const detail = data.errors?.[0]?.detail ?? data.errors?.[0]?.title;
    if (detail) return detail;
  } catch {
    /* ignore */
  }
  return text.slice(0, 300) || `HTTP ${status}`;
}
