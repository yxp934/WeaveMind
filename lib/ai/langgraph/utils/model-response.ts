import { decode as decodeToon } from "@toon-format/toon";

const BEGIN_TOON = "---BEGIN_TOON---";
const END_TOON = "---END_TOON---";

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

function extractToonSegment(text: string): string {
  const cleaned = text.trim();
  const begin = cleaned.indexOf(BEGIN_TOON);
  const end = cleaned.indexOf(END_TOON);

  if (begin !== -1 && end !== -1 && end > begin) {
    return cleaned.slice(begin + BEGIN_TOON.length, end).trim();
  }

  return firstToonBlock(text);
}

export function parseModelResponse<T = any>(text: string): T {
  // 首先尝试提取标准TOON格式
  let target = extractToonSegment(text);

  if (!target) {
    // 如果没有找到标准格式，尝试宽松匹配
    target = tryLooseExtraction(text);
  }

  if (!target) {
    throw new Error("模型返回为空，请检查提示词和模型设置");
  }

  // 清理文本，移除常见格式问题
  const cleanedTarget = cleanModelOutput(target);

  try {
    // 首先尝试TOON格式解码
    const result = decodeToon(cleanedTarget) as T;

    // 验证解析结果是否为空
    if (result && typeof result === 'object') {
      const hasMessage = (result as any).message && (result as any).message.length > 0;
      const hasNextAction = (result as any).next_action;

      if (!hasMessage && !hasNextAction) {
        throw new Error("模型返回了空的TOON响应，所有关键字段都为空");
      }
    }

    return result;
  } catch (toonError) {
    try {
      // TOON失败后尝试JSON格式
      const jsonResult = JSON.parse(cleanedTarget) as T;

      // 同样验证JSON结果
      if (jsonResult && typeof jsonResult === 'object') {
        const hasMessage = (jsonResult as any).message && (jsonResult as any).message.length > 0;
        const hasNextAction = (jsonResult as any).next_action;

        if (!hasMessage && !hasNextAction) {
          throw new Error("模型返回了空的JSON响应，所有关键字段都为空");
        }
      }

      return jsonResult;
    } catch (jsonError) {
      try {
        // 如果JSON也失败，尝试提取结构化信息
        const structuredResult = extractStructuredFromText(cleanedTarget) as T;

        // 验证结构化结果
        if (structuredResult && typeof structuredResult === 'object') {
          const hasMessage = (structuredResult as any).message && (structuredResult as any).message.length > 0;
          const hasNextAction = (structuredResult as any).next_action;

          if (!hasMessage && !hasNextAction) {
            throw new Error("模型返回了空的结构化响应，所有关键字段都为空");
          }
        }

        return structuredResult;
      } catch (structuredError) {
        throw new Error(
          `TOON解码失败: ${(toonError as Error).message}; JSON解析失败: ${(jsonError as Error).message}`,
        );
      }
    }
  }
}

export function parseModelData<T = any>(text: string): T {
  let target = extractToonSegment(text);

  if (!target) {
    target = tryLooseExtraction(text);
  }

  if (!target) {
    throw new Error("模型返回为空，请检查提示词和模型设置");
  }

  const cleanedTarget = cleanModelOutput(target);

  try {
    return decodeToon(cleanedTarget) as T;
  } catch (toonError) {
    try {
      return JSON.parse(cleanedTarget) as T;
    } catch (jsonError) {
      const loose = tryLooseExtraction(text);
      if (loose && loose !== cleanedTarget) {
        try {
          return JSON.parse(cleanModelOutput(loose)) as T;
        } catch (retryError) {
          // fall through to throw below
        }
      }
      throw new Error(
        `TOON解码失败: ${(toonError as Error).message}; JSON解析失败: ${(jsonError as Error).message}`,
      );
    }
  }
}

/**
 * 宽松模式提取TOON内容
 * 尝试在各种格式中找到可能的结构化数据
 */
function tryLooseExtraction(text: string): string {
  const cleaned = text.trim();

  // 尝试找到类似TOON的标记
  const beginMatch = cleaned.match(/---?BEGIN_?TOON---?/i);
  const endMatch = cleaned.match(/---?END_?TOON---?/i);

  if (beginMatch && endMatch) {
    const beginIndex = cleaned.toUpperCase().indexOf(beginMatch[0].toUpperCase());
    const endIndex = cleaned.toUpperCase().indexOf(endMatch[0].toUpperCase(), beginIndex);
    if (endIndex > beginIndex) {
      return cleaned.slice(beginIndex + beginMatch[0].length, endIndex).trim();
    }
  }

  // 尝试查找JSON-like结构
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return "";
}

/**
 * 清理模型输出中的常见问题
 */
function cleanModelOutput(text: string): string {
  let cleaned = text.trim();

  // 移除可能的markdown标记
  cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '');

  // 移除额外的空白行
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

  // 确保JSON格式的完整性
  if (cleaned.startsWith('{') && !cleaned.endsWith('}')) {
    cleaned += '}';
  }

  // 移除前后的引号
  cleaned = cleaned.replace(/^["']/, '').replace(/["']$/, '');

  return cleaned;
}

/**
 * 从文本中提取结构化信息
 * 当TOON和JSON都失败时的最后尝试
 */
function extractStructuredFromText(text: string): any {
  const result: any = {};

  // 提取message字段 - 支持更宽松的匹配
  const messagePatterns = [
    /message\s*:\s*["']?([^"'\n,}]+)/i,
    /["']?message["']?\s*:\s*["']?([^"'\n,}]+)/i,
    /"message":\s*"([^"]+)"/,
    /'message':\s*'([^']+)'/,
  ];

  for (const pattern of messagePatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 0) {
      result.message = match[1].trim();
      break;
    }
  }

  // 提取next_action字段 - 支持更宽松的匹配
  const actionPatterns = [
    /next_action\s*:\s*["']?([^"'\n,}]+)/i,
    /["']?next_action["']?\s*:\s*["']?([^"'\n,}]+)/i,
    /"next_action":\s*"([^"]+)"/,
    /'next_action':\s*'([^']+)'/,
  ];

  for (const pattern of actionPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 0) {
      const action = match[1].trim().toLowerCase();
      // 验证action值是否有效
      if (['ask_user', 'propose_tool', 'done'].includes(action)) {
        result.next_action = action;
        break;
      }
    }
  }

  // 如果能提取到基本信息，返回结构化对象
  if (result.message && result.message.length > 0) {
    // 确保next_action有默认值
    if (!result.next_action) {
      result.next_action = 'ask_user';
    }
    result.reasoning = "从文本中提取的结构化信息";
    return result;
  }

  throw new Error("无法从文本中提取有效的结构化信息");
}
