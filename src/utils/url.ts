export type SupportedPlatform = "chatgpt" | "deepseek" | "gemini";

export interface ParsedSourceUrl {
  url: string;
  platform: SupportedPlatform;
  shareId?: string;
}

const DEEPSEEK_ORIGIN = "https://chat.deepseek.com";
const GEMINI_ORIGIN = "https://gemini.google.com";

export function parseSourceUrl(rawUrl: string): ParsedSourceUrl | null {
  const trimmed = rawUrl.trim();
  let target: URL;
  try {
    target = new URL(trimmed);
  } catch {
    return null;
  }

  const hostname = target.hostname.toLowerCase();
  if (
    (hostname === "chatgpt.com" || hostname.endsWith(".chatgpt.com")) &&
    target.pathname.includes("/share/")
  ) {
    return { url: target.toString(), platform: "chatgpt" };
  }

  if (hostname === "chat.deepseek.com") {
    const shareId = extractShareId(target, ["share", "s"]);
    if (shareId) {
      return {
        url: `${DEEPSEEK_ORIGIN}/share/${shareId}`,
        platform: "deepseek",
        shareId,
      };
    }
  }

  if (hostname === "gemini.google.com") {
    const shareId = extractShareId(target, ["share"]);
    if (shareId) {
      return {
        url: `${GEMINI_ORIGIN}/share/${shareId}`,
        platform: "gemini",
        shareId,
      };
    }
  }

  if (hostname === "g.co") {
    const segments = target.pathname.split("/").filter(Boolean);
    if (segments[0] === "gemini") {
      const shareId = extractShareId(target, ["share"]);
      if (shareId) {
        return {
          url: `${GEMINI_ORIGIN}/share/${shareId}`,
          platform: "gemini",
          shareId,
        };
      }
    }
  }

  return null;
}

function extractShareId(target: URL, markers: string[]): string | null {
  const segments = target.pathname.split("/").filter(Boolean);
  const shareIndex = segments.findIndex((segment) => markers.includes(segment));
  if (shareIndex === -1 || shareIndex === segments.length - 1) {
    return null;
  }
  return segments[shareIndex + 1] || null;
}
