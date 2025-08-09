import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatWidget from './components/ChatWidget';
import { ConfigAPI } from './api/config';
import { WidgetConfig } from './types/chat-config';
import './styles/widget.css';

// Global interface for window object
declare global {
  interface Window {  
    ChatWidgetConfig?: WidgetConfig;
    ChatWidget?: {
      init: (config: WidgetConfig) => void;
      destroy: () => void;
    };
  }
}

class ChatWidgetEmbed {
  private root: ReactDOM.Root | null = null;
  private container: HTMLDivElement | null = null;
  private configAPI: ConfigAPI | null = null;

  async init(config: WidgetConfig) {
    try {
      // Validate required config
      if (!config.widgetId) {
        console.error('ChatWidget: Missing required configuration (sellerId, widgetId, apiUrl)');
        return;
      }

      // Initialize API client
      this.configAPI = new ConfigAPI();

      console.log("The widget_id passed from the script tag " , config.widgetId);
      // Fetch widget configuration
      const widgetConfig = await this.configAPI.fetchWidgetConfig(config.widgetId);

      // Create container
      this.createContainer();

      // Render widget
      if (this.container && this.root) {
        this.root.render(
          React.createElement(ChatWidget, {
            config: widgetConfig,
            widgetId: config.widgetId,
          })
        );
      }

      console.log('ChatWidget initialized successfully');
    } catch (error) {
      console.error('ChatWidget initialization failed:', error);
    }
  }

  private createContainer() {
    // Remove existing container if any
    this.destroy();

    // Create new container
    this.container = document.createElement('div');
    this.container.id = 'chat-widget-embed';
    this.container.className = 'chat-widget-embed';
    
    // Append to body
    document.body.appendChild(this.container);

    // Create React root
    this.root = ReactDOM.createRoot(this.container);
  }

  destroy() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    if (this.container) {
      document.body.removeChild(this.container);
      this.container = null;
    }
  }
}

// Initialize widget when DOM is ready
function initializeWidget() {
  const widgetEmbed = new ChatWidgetEmbed();

  // Expose API to window object
  window.ChatWidget = {
    init: (config: WidgetConfig) => widgetEmbed.init(config),
    destroy: () => widgetEmbed.destroy()
  };

  // Auto-initialize if config is available
  if (window.ChatWidgetConfig) {
    widgetEmbed.init(window.ChatWidgetConfig);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWidget);
} else {
  initializeWidget();
}

// Export for module usage
export { ChatWidget, ConfigAPI };
export type { WidgetConfig } from './types/chat-config';
