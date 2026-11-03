import fs from "fs";

export interface PlaywrightInterceptOptions {
  targetUrl: string;
  urlPattern?: RegExp;
  waitSelector?: string;
  timeoutMs?: number;
}

export interface PlaywrightInterceptResult {
  html: string;
  interceptedJsonPayloads: unknown[];
}

const MAC_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
];

function findExecutablePath(): string | undefined {
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  }
  for (const candidate of MAC_CHROME_PATHS) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Optional Playwright headless browser fallback for anti-bot / WAF-protected
 * booking pages (e.g. Imperva on Sabre QVDX or dynamic SPA rendering).
 */
export async function fetchWithPlaywrightFallback(
  options: PlaywrightInterceptOptions
): Promise<PlaywrightInterceptResult | null> {
  if (process.env.ENABLE_PLAYWRIGHT_FALLBACK !== "true") {
    return null;
  }

  const executablePath = findExecutablePath();
  if (!executablePath) {
    return null;
  }

  let browser;
  try {
    const { chromium } = await import("playwright-core");
    browser = await chromium.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"]
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 820 },
      ignoreHTTPSErrors: true
    });

    const page = await context.newPage();
    const interceptedJsonPayloads: unknown[] = [];

    page.on("response", async (response) => {
      try {
        const resUrl = response.url();
        if (options.urlPattern && options.urlPattern.test(resUrl)) {
          const contentType = response.headers()["content-type"] ?? "";
          if (contentType.includes("json")) {
            const json = await response.json();
            interceptedJsonPayloads.push(json);
          }
        }
      } catch {
        // Ignore non-JSON or aborted responses
      }
    });

    await page.goto(options.targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: options.timeoutMs ?? 9000
    });

    if (options.waitSelector) {
      await page
        .waitForSelector(options.waitSelector, { timeout: 4500 })
        .catch(() => null);
    } else {
      await page.waitForTimeout(2200);
    }

    const html = await page.content();
    await browser.close();
    return { html, interceptedJsonPayloads };
  } catch {
    if (browser) {
      await browser.close().catch(() => null);
    }
    return null;
  }
}

