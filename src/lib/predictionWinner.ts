import { Prisma } from "@prisma/client";

const looksLikeJsonPayload = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
};

export function normalizePredictionWinnerForWrite(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (value === null || value === undefined || value === "") {
    return Prisma.DbNull;
  }

  if (typeof value === "string" && looksLikeJsonPayload(value)) {
    try {
      return JSON.parse(value) as Prisma.InputJsonValue;
    } catch {
      return value;
    }
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return value as Prisma.InputJsonValue;
}

export function readPredictionWinner<T = unknown>(value: unknown): T | string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" && looksLikeJsonPayload(value)) {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value;
    }
  }

  return value as T | string;
}
