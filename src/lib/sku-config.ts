export type SkuConfig = {
  partCount: number;
  serialPart: number;
  separator: string;
  serialStartNo: string;
  parts: string[];
};

export const DEFAULT_SKU_SEPARATOR = "-";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function asCleanString(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function asDigits(value: unknown, fallback: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  const digits = raw.replace(/\D/g, "");
  return digits || fallback;
}

export function normalizeSkuConfig(
  rawConfig: unknown,
  fallbackPrefix = "RJ",
  fallbackStartNo = "1001"
): SkuConfig {
  const fallback: SkuConfig = {
    partCount: 2,
    serialPart: 2,
    separator: DEFAULT_SKU_SEPARATOR,
    serialStartNo: asDigits(fallbackStartNo, "1001"),
    parts: [asCleanString(fallbackPrefix) || "RJ", ""],
  };

  if (!rawConfig || typeof rawConfig !== "object" || Array.isArray(rawConfig)) {
    return fallback;
  }

  const input = rawConfig as Record<string, unknown>;
  const partCount = clamp(
    typeof input.partCount === "number" ? Math.floor(input.partCount) : fallback.partCount,
    1,
    5
  );
  const serialPart = clamp(
    typeof input.serialPart === "number" ? Math.floor(input.serialPart) : fallback.serialPart,
    1,
    partCount
  );
  const separator = asCleanString(input.separator) || DEFAULT_SKU_SEPARATOR;
  const serialStartNo = asDigits(input.serialStartNo, fallback.serialStartNo);

  const rawParts = Array.isArray(input.parts) ? input.parts : [];
  const parts = Array.from({ length: partCount }, (_, index) => asCleanString(rawParts[index] ?? ""));

  return {
    partCount,
    serialPart,
    separator,
    serialStartNo,
    parts,
  };
}

export function formatSerialNo(serialNo: number, serialWidth: number) {
  return String(serialNo).padStart(serialWidth, "0");
}

export function buildSkuFromSerial(config: SkuConfig, serialNo: number) {
  const safeConfig = normalizeSkuConfig(config);
  const serialWidth = safeConfig.serialStartNo.length;
  const serialSegment = formatSerialNo(serialNo, serialWidth);

  const segments: string[] = [];
  for (let index = 0; index < safeConfig.partCount; index++) {
    const partIndex = index + 1;
    if (partIndex === safeConfig.serialPart) {
      segments.push(serialSegment);
      continue;
    }
    const part = safeConfig.parts[index] || "";
    segments.push(part);
  }

  return segments.join(safeConfig.separator);
}

export function extractSerialNo(config: SkuConfig, sku: string): number | null {
  const safeConfig = normalizeSkuConfig(config);
  const segments = sku.split(safeConfig.separator);
  if (segments.length !== safeConfig.partCount) return null;

  for (let index = 0; index < safeConfig.partCount; index++) {
    const partIndex = index + 1;
    if (partIndex === safeConfig.serialPart) continue;
    const expected = safeConfig.parts[index] || "";
    if (segments[index] !== expected) return null;
  }

  const serialSegment = segments[safeConfig.serialPart - 1];
  if (!/^\d+$/.test(serialSegment)) return null;
  const parsed = parseInt(serialSegment, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
