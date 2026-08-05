/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SURREAL_URL:  string;
  readonly VITE_SURREAL_NS:   string;
  readonly VITE_SURREAL_DB:   string;
  readonly VITE_SURREAL_USER: string;
  readonly VITE_SURREAL_PASS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
