/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Backend base URL; empty means same origin (proxied by Vite in development).
  readonly VITE_API_URL?: string;
  // "backend" or "local" (default): which data source the app starts with.
  readonly VITE_DATA_SOURCE?: string;
}
