export const collectOption = (value: string, previous: string[] = []): string[] => {
  previous.push(value);
  return previous;
};

export const stringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v));
};
