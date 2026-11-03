import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import https from "https";

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15"
];

/**
 * Custom HTTPS agent that enables keep-alive and handles incomplete intermediate
 * certificate chains on regional airline APIs (e.g., api.laoskyway.com).
 */
const permissiveHttpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: false
});

export class BrowserHttpClient {
  private cookieJar: Map<string, Map<string, string>> = new Map();
  private client: AxiosInstance;

  constructor(private readonly defaultReferer?: string) {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    this.client = axios.create({
      timeout: 8500,
      httpsAgent: permissiveHttpsAgent,
      headers: {
        "User-Agent": ua,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,lo;q=0.8",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Ch-Ua":
          '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Upgrade-Insecure-Requests": "1",
        ...(defaultReferer ? { Referer: defaultReferer } : {})
      },
      validateStatus: (status) => status >= 200 && status < 500
    });

    this.client.interceptors.request.use((config) => {
      if (config.url) {
        try {
          const host = new URL(config.url).hostname;
          const cookies = this.getCookieHeader(host);
          if (cookies) {
            config.headers.set("Cookie", cookies);
          }
        } catch {
          // Ignore relative URL parse errors
        }
      }
      return config;
    });

    this.client.interceptors.response.use((response) => {
      const setCookie = response.headers["set-cookie"];
      if (setCookie && response.config.url) {
        try {
          const host = new URL(response.config.url).hostname;
          this.storeCookies(host, setCookie);
        } catch {
          // Ignore cookie parse error
        }
      }
      return response;
    });
  }

  private storeCookies(host: string, setCookieHeaders: string[]): void {
    const baseDomain = host.split(".").slice(-2).join(".");
    const domainJar = this.cookieJar.get(baseDomain) ?? new Map<string, string>();
    for (const raw of setCookieHeaders) {
      const firstPart = raw.split(";")[0];
      const eqIdx = firstPart.indexOf("=");
      if (eqIdx > 0) {
        const key = firstPart.slice(0, eqIdx).trim();
        const val = firstPart.slice(eqIdx + 1).trim();
        domainJar.set(key, val);
      }
    }
    this.cookieJar.set(baseDomain, domainJar);
  }

  private getCookieHeader(host: string): string {
    const baseDomain = host.split(".").slice(-2).join(".");
    const domainJar = this.cookieJar.get(baseDomain);
    if (!domainJar || domainJar.size === 0) return "";
    return Array.from(domainJar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<{
    status: number;
    data: T;
    headers: Record<string, unknown>;
  }> {
    const res = await this.client.get<T>(url, config);
    return {
      status: res.status,
      data: res.data,
      headers: res.headers as Record<string, unknown>
    };
  }

  async post<T = unknown>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig
  ): Promise<{
    status: number;
    data: T;
    headers: Record<string, unknown>;
  }> {
    const res = await this.client.post<T>(url, body, config);
    return {
      status: res.status,
      data: res.data,
      headers: res.headers as Record<string, unknown>
    };
  }
}

