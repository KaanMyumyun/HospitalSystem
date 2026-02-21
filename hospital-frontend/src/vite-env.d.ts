/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Add your custom environment variables here
  readonly VITE_API_URL: string;
  
  // Example of another variable you might add later:
  // readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}