import { ChatConfig, defaultConfig } from "../types/chat-config";

export class ConfigAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_API_BASE_URL}`;
  }

  // Simple message sending via REST API
  async sendMessage(
    sellerId: string,
    widgetId: string,
    message: string,
    userInfo?: any
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sendmessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sellerId,
          widgetId,
          message,
          userInfo,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        console.log("Message sent successfully via REST API");
        return true;
      } else {
        console.warn("Failed to send message via REST API:", response.status);
        return false;
      }
    } catch (error) {
      console.error("Error sending message via REST API:", error);
      return false;
    }
  }

  async fetchWidgetConfig(widgetId: string): Promise<ChatConfig> {
    try {
      const response = await fetch(
        `${this.baseUrl}/config/widget/?widgetId=${widgetId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.warn(
          `API request failed: ${response.status} ${response.statusText}. Using default config.`
        );
        return this.getDefaultConfig();
      }

      const config = await response.json();
      console.log("Fetched config:", config);

      // Merge with default config to ensure all fields are present
      const mergedConfig = { ...this.getDefaultConfig(), ...config };
      return mergedConfig;
    } catch (error) {
      console.warn("Error fetching widget config, using default:", error);

      // Return default config as fallback
      return this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): ChatConfig {
   return (
    defaultConfig
   )
  }
}
