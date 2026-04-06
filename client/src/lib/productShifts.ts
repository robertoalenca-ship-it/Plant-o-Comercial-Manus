export type LegacyShiftType =
  | "manha_sus"
  | "manha_convenio"
  | "tarde_sus"
  | "tarde_convenio"
  | "noite"
  | "plantao_24h";

export type ProductShiftType = "manha" | "tarde" | "noite";
export type StandardLegacyShiftType = Exclude<LegacyShiftType, "plantao_24h">;

export type ProductShiftOption = {
  colorClass: string;
  defaultLegacyKey: LegacyShiftType;
  key: ProductShiftType;
  label: string;
  legacyKeys: readonly LegacyShiftType[];
  short: string;
};

export const PRODUCT_SHIFT_OPTIONS: readonly ProductShiftOption[] = [
  {
    colorClass: "shift-manha",
    defaultLegacyKey: "manha_sus",
    key: "manha",
    label: "Manha",
    legacyKeys: ["manha_sus", "manha_convenio"],
    short: "Manha",
  },
  {
    colorClass: "shift-tarde",
    defaultLegacyKey: "tarde_sus",
    key: "tarde",
    label: "Tarde",
    legacyKeys: ["tarde_sus", "tarde_convenio"],
    short: "Tarde",
  },
  {
    colorClass: "shift-noite",
    defaultLegacyKey: "noite",
    key: "noite",
    label: "Noite",
    legacyKeys: ["noite", "plantao_24h"],
    short: "Noite",
  },
] as const;

const LEGACY_TO_PRODUCT_SHIFT: Record<LegacyShiftType, ProductShiftType> = {
  manha_convenio: "manha",
  manha_sus: "manha",
  noite: "noite",
  plantao_24h: "noite",
  tarde_convenio: "tarde",
  tarde_sus: "tarde",
};

const PRODUCT_SHIFT_DEFAULTS: Record<ProductShiftType, LegacyShiftType> = {
  manha: "manha_sus",
  noite: "noite",
  tarde: "tarde_sus",
};

const PRODUCT_SHIFT_OPTION_BY_KEY = new Map(
  PRODUCT_SHIFT_OPTIONS.map((shift) => [shift.key, shift] as const)
);

export function isLegacyShiftType(value: string): value is LegacyShiftType {
  return value in LEGACY_TO_PRODUCT_SHIFT;
}

export function isProductShiftType(value: string): value is ProductShiftType {
  return value in PRODUCT_SHIFT_DEFAULTS;
}

export function getProductShiftKey(
  shiftType: string
): ProductShiftType | null {
  if (isProductShiftType(shiftType)) {
    return shiftType;
  }

  if (isLegacyShiftType(shiftType)) {
    return LEGACY_TO_PRODUCT_SHIFT[shiftType];
  }

  return null;
}

export function getProductShiftOption(
  shiftType: string
): ProductShiftOption | undefined {
  const shiftKey = getProductShiftKey(shiftType);
  return shiftKey ? PRODUCT_SHIFT_OPTION_BY_KEY.get(shiftKey) : undefined;
}

export function getProductShiftLabel(shiftType: string) {
  return getProductShiftOption(shiftType)?.label ?? shiftType;
}

export function toLegacyShiftType(shiftType: string): LegacyShiftType {
  if (isLegacyShiftType(shiftType)) {
    return shiftType;
  }

  if (isProductShiftType(shiftType)) {
    return PRODUCT_SHIFT_DEFAULTS[shiftType];
  }

  return PRODUCT_SHIFT_DEFAULTS.manha;
}

export function toLegacyStandardShiftType(
  shiftType: string
): StandardLegacyShiftType {
  const legacyShift = toLegacyShiftType(shiftType);
  return legacyShift === "plantao_24h" ? "noite" : legacyShift;
}
