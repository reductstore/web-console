import { APIError, Client, Token } from "reduct-js";

export interface IBackendAPI {
  client: Client;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isAllowed: () => Promise<boolean>;
  onUnauthorized?: () => void;

  me: () => Promise<Token>;
}

export class BackendAPI implements IBackendAPI {
  private apiToken?: string;
  private readonly url: string;
  private mClient: Client;
  onUnauthorized?: () => void;

  constructor(url: string) {
    const apiToken = sessionStorage.getItem("apiToken");
    if (apiToken) {
      this.apiToken = apiToken;
    }

    this.url = url;
    this.mClient = this.createClient();
  }

  get client() {
    return this.mClient;
  }

  async login(apiToken: string) {
    const client = new Client(this.url, { apiToken });
    await client.getInfo();

    this.apiToken = apiToken;
    sessionStorage.setItem("apiToken", apiToken);
    this.mClient = this.createClient();
  }

  logout() {
    this.apiToken = undefined;
    sessionStorage.removeItem("apiToken");
    this.mClient = this.createClient();
  }

  async isAllowed(): Promise<boolean> {
    try {
      const raw = this.createRawClient();
      await raw.getInfo();
      return true;
    } catch (err) {
      if (err instanceof APIError && err.status == 401) {
        sessionStorage.removeItem("apiToken");
        return false;
      }

      throw err;
    }
  }

  async me(): Promise<Token> {
    try {
      const raw = this.createRawClient();
      return raw.me();
    } catch (err) {
      if (err instanceof APIError && err.status == 401) {
        sessionStorage.removeItem("apiToken");
        return {
          name: "anonymous",
          createdAt: Date.now(),
          isProvisioned: false,
          permissions: { fullAccess: false },
        };
      }

      throw err;
    }
  }

  private createRawClient(): Client {
    return this.apiToken
      ? new Client(this.url, { apiToken: this.apiToken })
      : new Client(this.url);
  }

  /**
   * Create a Client that intercepts 401 errors to trigger logout and redirect.
   * Swallows 401 errors so components don't show redundant toasts.
   */
  private createClient(): Client {
    const raw = this.createRawClient();

    return new Proxy(raw, {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value !== "function") return value;

        return (...args: unknown[]) => {
          const result = value.apply(target, args);
          if (!(result instanceof Promise)) return result;

          return result.catch((err: unknown) => {
            if (err instanceof APIError && err.status === 401) {
              this.logout();
              this.onUnauthorized?.();
              return new Promise(() => {});
            }
            throw err;
          });
        };
      },
    });
  }
}
