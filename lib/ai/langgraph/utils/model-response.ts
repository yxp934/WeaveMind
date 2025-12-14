import { decode as decodeToon } from "@toon-format/toon";

function stripCodeFences(text: string): string {
  let cleaned = text.trim();

  // 移除开头的 ```xxx\n 前缀
  while (cleaned.startsWith("```")) {
    const nextLine = cleaned.indexOf("\n");
    if (nextLine === -1) {
      cleaned = "";
      break;
    }
    cleaned = cleaned.slice(nextLine + 1).trimStart();
  }

  // 移除结尾的 ``` 及后续内容
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, cleaned.lastIndexOf("```")).trimEnd();
  }

  return cleaned;
}

function firstToonBlock(text: string): string {
  const sanitized = stripCodeFences(text);
  const parts = sanitized.split(/\n```/);
  return parts[0].trim();
}

export function parseModelResponse<T = any>(text: string): T {
  const target = firstToonBlock(text);

  if (!target) {
    throw new Error("模型返回为空，请检查提示词和模型设置");
  }

  try {
    return decodeToon(target) as T;
  } catch (toonError) {
    try {
      return JSON.parse(target) as T;
    } catch (jsonError) {
      throw new Error(
        `TOON解码失败: ${(toonError as Error).message}; JSON解析失败: ${(
          jsonError as Error
        ).message}`,
      );
    }
  }
}
