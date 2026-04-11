/**
 * 将 `agent --output-format stream-json` 的一行 stdout 解析为对象；空行或非法 JSON 返回 `null`。
 */
export const parseLine = (line: string): StreamJsonLine | null => {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as StreamJsonLine;
  } catch {
    return null;
  }
}