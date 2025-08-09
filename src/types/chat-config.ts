export interface ChatConfig {
  id?: string;
  themeColor: string;
  sellerId?: string;
  welcomeMessage: string;
  welcomeMessageIcon?: string;
  fallbackMessage: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showUserStatus: boolean;
  showMessageStatus: boolean;
  showAgentIcon: boolean;
  companyName: string;
  agentName: string;
  companyLogo?: string;

  // Chat widget icon and prompt
  chatIcon: 'message-circle' | 'message-square' | 'phone' | 'headphones' | 'help-circle' | 'mail' | 'custom';
  customChatIconUrl?: string;
  showChatPrompt: boolean;
  chatPromptMessage: string;
  /**
   * Style for the chat prompt bubble (e.g. 'bubble-above', 'inline').
   */
  promptStyle?: 'bubble-above' | 'inline';

  // User information collection
  requireUserInfo: boolean;
  requiredFields: {
    name: boolean;
    email: boolean;
    phone: boolean;
  };
  userInfoMessage: string;

  // Agent configuration
  agentType: 'human' | 'ai' | 'custom';
  openaiConfig: {
    apiKey: string;
    model: string;
    systemPrompt: string;
  };
  customAgentConfig: {
    webhookUrl: string;
    headers: Record<string, string>;
  };

  // Business hours
  businessHours: {
    enabled: boolean;
    timezone: string;
    schedule: {
      monday: { enabled: boolean; startTime: string; endTime: string };
      tuesday: { enabled: boolean; startTime: string; endTime: string };
      wednesday: { enabled: boolean; startTime: string; endTime: string };
      thursday: { enabled: boolean; startTime: string; endTime: string };
      friday: { enabled: boolean; startTime: string; endTime: string };
      saturday: { enabled: boolean; startTime: string; endTime: string };
      sunday: { enabled: boolean; startTime: string; endTime: string };
    };
    outsideHoursMessage: string;
  };

  // Disconnect settings
  disconnectSettings: {
    enabled: boolean;
    inactivityTimeoutMinutes: number;
    disconnectMessage: string;
    showReconnectButton: boolean;
  };
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  status?: "sending" | "delivered" | "seen";
}

export interface UserStatus {
  isOnline: boolean;
  lastSeen?: Date;
}

export interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isAgentOnline: boolean;
  isTyping: boolean;
}

export interface WidgetConfig {
  widgetId: string;
}

export interface UserInfo {
  email: string;
  name?: string;
  phone?: string;
}

export const defaultConfig: ChatConfig = {
  themeColor: '#6366f1',
  welcomeMessage: 'Hi there! How can we help you today?',
  welcomeMessageIcon: '👋',
  fallbackMessage: 'Sorry, our agents are currently unavailable. Please leave a message and we\'ll get back to you soon!',
  position: 'bottom-right',
  showUserStatus: true,
  showMessageStatus: true,
  showAgentIcon: true,
  companyName: 'Your Company',
  agentName: 'Support Agent',

  // Chat widget icon and prompt defaults
  chatIcon: 'message-circle',
  showChatPrompt: false,
  chatPromptMessage: 'Hi there, have a question? Text us here.',

  requireUserInfo: true,
  requiredFields: {
    name: true,
    email: true,
    phone: false
  },
  userInfoMessage: 'Please provide your details to start the conversation:',
  agentType: 'human',
  openaiConfig: {
    apiKey: '',
    model: 'gpt-3.5-turbo',
    systemPrompt: 'You are a helpful customer support assistant.'
  },
  customAgentConfig: {
    webhookUrl: '',
    headers: {}
  },
  businessHours: {
    enabled: false,
    timezone: 'UTC',
    schedule: {
      monday: { enabled: true, startTime: '09:00', endTime: '17:00' },
      tuesday: { enabled: true, startTime: '09:00', endTime: '17:00' },
      wednesday: { enabled: true, startTime: '09:00', endTime: '17:00' },
      thursday: { enabled: true, startTime: '09:00', endTime: '17:00' },
      friday: { enabled: true, startTime: '09:00', endTime: '17:00' },
      saturday: { enabled: false, startTime: '09:00', endTime: '17:00' },
      sunday: { enabled: false, startTime: '09:00', endTime: '17:00' }
    },
    outsideHoursMessage: 'We\'re currently offline. Please leave a message and we\'ll get back to you during business hours.'
  },
  disconnectSettings: {
    enabled: false,
    inactivityTimeoutMinutes: 15,
    disconnectMessage: 'You\'ve been disconnected due to inactivity. Please start a new conversation if you need further assistance.',
    showReconnectButton: true
  }
};