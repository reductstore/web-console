declare module "prettier-bytes" {
  export default function prettierBytes(bytes: number): string;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: "development" | "production" | "test";
    readonly PUBLIC_URL: string;
    readonly REACT_APP_VERSION: string;
    readonly REACT_APP_STORAGE_URL?: string;
  }
}
