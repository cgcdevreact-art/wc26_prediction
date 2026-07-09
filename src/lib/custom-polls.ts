export const CUSTOM_POLL_STATUSES = ["UPCOMING", "LIVE", "COMPLETED", "ARCHIVED"] as const;

export type CustomPollStatus = (typeof CUSTOM_POLL_STATUSES)[number];

export type CustomPollOptionInput = {
  id?: string;
  label: string;
  shortLabel?: string | null;
  imageUrl?: string | null;
  accentColor?: string | null;
  sortOrder?: number;
};

export type CustomPollInput = {
  question: string;
  description?: string | null;
  status?: string | null;
  opensAt?: string | null;
  closesAt?: string | null;
  options: CustomPollOptionInput[];
};

type PollStatusSource = {
  status?: string | null;
  opensAt?: Date | string | null;
  closesAt?: Date | string | null;
};

export function normalizeCustomPollStatus(status?: string | null): CustomPollStatus {
  const normalized = (status || "UPCOMING").toUpperCase();
  if (CUSTOM_POLL_STATUSES.includes(normalized as CustomPollStatus)) {
    return normalized as CustomPollStatus;
  }
  return "UPCOMING";
}

export function deriveCustomPollStatus(
  poll: PollStatusSource,
  now: Date = new Date()
): CustomPollStatus {
  const manualStatus = normalizeCustomPollStatus(poll.status);
  const opensAt = poll.opensAt ? new Date(poll.opensAt) : null;
  const closesAt = poll.closesAt ? new Date(poll.closesAt) : null;

  if (manualStatus === "ARCHIVED") {
    return "ARCHIVED";
  }

  if (manualStatus === "COMPLETED") {
    return "COMPLETED";
  }

  if (closesAt && closesAt.getTime() <= now.getTime()) {
    return "COMPLETED";
  }

  if (opensAt && opensAt.getTime() > now.getTime()) {
    return "UPCOMING";
  }

  if (manualStatus === "UPCOMING" && !opensAt) {
    return "UPCOMING";
  }

  return "LIVE";
}

export function normalizeCustomPollInput(input: CustomPollInput) {
  const question = input.question.trim();
  const description = input.description?.trim() || null;
  const status = normalizeCustomPollStatus(input.status);
  const opensAt = input.opensAt ? new Date(input.opensAt) : null;
  const closesAt = input.closesAt ? new Date(input.closesAt) : null;
  const options = input.options
    .map((option, index) => ({
      id: option.id,
      label: option.label.trim(),
      shortLabel: option.shortLabel?.trim() || null,
      imageUrl: option.imageUrl?.trim() || null,
      accentColor: option.accentColor?.trim() || null,
      sortOrder: option.sortOrder ?? index,
    }))
    .filter((option) => option.label.length > 0);

  if (!question) {
    throw new Error("Question is required.");
  }

  if (options.length < 2) {
    throw new Error("At least two options are required.");
  }

  if (options.length > 8) {
    throw new Error("A poll can have at most eight options.");
  }

  const uniqueLabels = new Set(options.map((option) => option.label.toLowerCase()));
  if (uniqueLabels.size !== options.length) {
    throw new Error("Option labels must be unique.");
  }

  if (opensAt && closesAt && opensAt.getTime() >= closesAt.getTime()) {
    throw new Error("Closing time must be later than opening time.");
  }

  return {
    question,
    description,
    status,
    opensAt,
    closesAt,
    options,
  };
}
