/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the API server lives when the app is hosted separately (e.g. https://vyapar-vaani.onrender.com) */
  readonly VITE_API_BASE?: string;
  /** "true" hides the demo-account buttons on the login screen */
  readonly VITE_HIDE_DEMO?: string;
  /** "true" opens the server-address box on the login screen by default */
  readonly VITE_SHOW_SERVER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
