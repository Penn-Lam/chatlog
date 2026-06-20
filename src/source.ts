import { readFile } from "node:fs/promises";
import {
  type ParsedSourceUrl,
  parseSourceUrl,
} from "./utils/url";
import {
  extractAtFromShareHtml,
  extractGeminiSessionParamsFromShareHtml,
  type GeminiShareSnapshotPayload,
} from "./parsers/gemini";

export interface LoadedSource {
  source: string;
  payload: unknown;
}

const DEEPSEEK_SHARE_API = "https://chat.deepseek.com/api/v0/share/content";
const GEMINI_BATCHEXECUTE_API =
  "https://gemini.google.com/_/BardChatUi/data/batchexecute";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ChatlogExporter/0.1";
const GEMINI_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

export async function loadSource(
  input: string,
  options: { insecure?: boolean } = {},
): Promise<LoadedSource> {
  const parsedUrl = parseSourceUrl(input);
  if (!parsedUrl) {
    return {
      source: input,
      payload: await loadLocalPayload(input),
    };
  }

  if (parsedUrl.platform === "deepseek") {
    return {
      source: parsedUrl.url,
      payload: await fetchDeepseekShare(parsedUrl),
    };
  }

  if (parsedUrl.platform === "gemini") {
    return {
      source: parsedUrl.url,
      payload: await fetchGeminiShare(parsedUrl),
    };
  }

  return {
    source: parsedUrl.url,
    payload: await fetchHtml(parsedUrl.url, options),
  };
}

async function loadLocalPayload(path: string): Promise<unknown> {
  const text = await readFile(path, "utf8");
  if (path.toLowerCase().endsWith(".json")) {
    return JSON.parse(text);
  }
  return text;
}

async function fetchHtml(
  input: string,
  options: { insecure?: boolean } = {},
): Promise<string> {
  if (options.insecure) {
    const proc = Bun.spawn([
      "curl",
      "-k",
      "-L",
      "--http1.1",
      "--retry",
      "2",
      "--retry-delay",
      "1",
      "-A",
      DEFAULT_USER_AGENT,
      "-H",
      "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "-H",
      "Accept-Language: zh-CN,zh;q=0.9",
      input,
    ]);
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (exitCode !== 0) {
      throw new Error(`抓取失败：${stderr.trim() || `curl exited ${exitCode}`}`);
    }
    return stdout;
  }

  const response = await fetch(input, {
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9",
    },
  });

  const html = await response.text();
  if (!response.ok) {
    throw new Error(`抓取失败：HTTP ${response.status}`);
  }

  return html;
}

async function fetchDeepseekShare(source: ParsedSourceUrl): Promise<unknown> {
  if (!source.shareId) {
    throw new Error("DeepSeek 分享链接缺少 share_id。");
  }

  const apiUrl = new URL(DEEPSEEK_SHARE_API);
  apiUrl.searchParams.set("share_id", source.shareId);

  const response = await fetch(apiUrl, {
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "zh-CN,zh;q=0.9",
      Referer: source.url,
      "Cache-Control": "no-cache",
      "X-App-Version": "20241129.1",
      "X-Client-Locale": "zh_CN",
      "X-Client-Platform": "web",
      "X-Client-Version": "1.4.0",
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`DeepSeek 分享抓取失败：HTTP ${response.status}`);
  }

  const payload = JSON.parse(text);
  if (payload?.code !== 0) {
    throw new Error(payload?.msg || payload?.data?.biz_msg || "DeepSeek 接口返回异常。");
  }
  return payload;
}

async function fetchGeminiShare(
  source: ParsedSourceUrl,
): Promise<GeminiShareSnapshotPayload> {
  if (!source.shareId) {
    throw new Error("Gemini 分享链接缺少 share_id。");
  }

  const shareResponse = await fetch(source.url, {
    headers: {
      "User-Agent": GEMINI_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9",
    },
  });
  const shareHtml = await shareResponse.text();
  if (!shareResponse.ok) {
    throw new Error(`Gemini 分享链接抓取失败：HTTP ${shareResponse.status}`);
  }

  const at = extractAtFromShareHtml(shareHtml);
  const { bl, fSid } = extractGeminiSessionParamsFromShareHtml(shareHtml);
  if (!bl || !fSid) {
    throw new Error("Gemini 分享页结构变化，无法提取会话参数。");
  }

  const cookieHeader = shareResponse.headers.getSetCookie
    ? shareResponse.headers
        .getSetCookie()
        .map((entry) => entry.split(";")[0])
        .filter(Boolean)
        .join("; ")
    : (shareResponse.headers.get("set-cookie") ?? "");

  const params = new URLSearchParams({
    rpcids: "ujx1Bf",
    "source-path": `/share/${source.shareId}`,
    bl,
    "f.sid": fSid,
    hl: "zh-CN",
    _reqid: `${Math.floor(Math.random() * 900000) + 100000}`,
    rt: "c",
  });

  const form = new URLSearchParams();
  form.set(
    "f.req",
    JSON.stringify([
      [["ujx1Bf", JSON.stringify([null, source.shareId, [4]]), null, "generic"]],
    ]),
  );
  if (at) {
    form.set("at", at);
  }

  const response = await fetch(`${GEMINI_BATCHEXECUTE_API}?${params}`, {
    method: "POST",
    body: form.toString(),
    headers: {
      "User-Agent": GEMINI_USER_AGENT,
      Accept: "*/*",
      "Accept-Language": "zh-CN,zh;q=0.9",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Origin: "https://gemini.google.com",
      Referer: "https://gemini.google.com/",
      "X-Same-Domain": "1",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });
  const batchexecute = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini 分享对话抓取失败：HTTP ${response.status}`);
  }

  return {
    shareUrl: source.url,
    at,
    bl,
    fSid,
    shareHtml,
    batchexecute,
    meta: { shareId: source.shareId },
  };
}
