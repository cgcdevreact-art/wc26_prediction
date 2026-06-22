import { Prisma } from "@prisma/client";

const looksLikeJsonPayload = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
};

export function normalizePredictionWinnerString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string" && !looksLikeJsonPayload(value)) {
    return value;
  }

  return null;
}

export function normalizePredictionPayload(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (value === null || value === undefined || value === "") {
    return Prisma.DbNull;
  }

  if (typeof value === "string" && looksLikeJsonPayload(value)) {
    try {
      return JSON.parse(value) as Prisma.InputJsonValue;
    } catch {
      return Prisma.DbNull;
    }
  }

  if (typeof value === "object") {
    return value as Prisma.InputJsonValue;
  }

  return Prisma.DbNull;
}

export function readPredictionPayload<T = unknown>(
  predictedPayload: unknown,
  predictedWinner?: unknown,
): T | string | null {
  if (predictedPayload !== null && predictedPayload !== undefined) {
    return predictedPayload as T;
  }

  if (predictedWinner === null || predictedWinner === undefined) {
    return null;
  }

  if (typeof predictedWinner === "string" && looksLikeJsonPayload(predictedWinner)) {
    try {
      return JSON.parse(predictedWinner) as T;
    } catch {
      return predictedWinner;
    }
  }

  return predictedWinner as T | string;
}
