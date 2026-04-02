export const toNumberOrUndefined = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const toPercent = (current: number, max: number) =>
  Math.round((Math.min(max, Math.max(0, current)) / Math.max(1, max)) * 100);

export const toSigned = (value: number) => (value >= 0 ? `+${value}` : `${value}`);

export const toDisplayAction = (action: string) => action.replace(/_/g, " ");
