export const parseLine = (line: string): StreamJsonLine | null => {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as StreamJsonLine;
  } catch {
    return null;
  }
}