/// <reference types="vite/client" />

// Extend Navigator interface to include deviceMemory
interface Navigator {
  deviceMemory?: number;
}

// Extend ImportMeta interface for Vite environment variables
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SOCKET_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Extend Window interface for ChatWidgetConfig
declare global {
  interface Window {
    ChatWidgetConfig?: {
      widgetId: string;
      sellerId?: string;
      apiUrl?: string;
    };
    ChatWidget?: {
      init: (config: any) => void;
      destroy: () => void;
    };
  }
}