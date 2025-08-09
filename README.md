# Chat Widget Embed

An embeddable chat widget that can be integrated into any website via a simple script tag.

## Features

- 🚀 Easy integration with script tag
- 🎨 Fully customizable themes and branding
- 📱 Responsive design for all devices
- 🔧 Configurable user information collection
- 🤖 Support for human agents, OpenAI, and custom webhooks
- 🎯 Position control (bottom-right or bottom-left)
- ✨ Modern UI with animations and effects

## Quick Start

### 1. Installation

```bash
npm install
npm run dev
```

### 2. Build for Production

```bash
npm run build
```

This creates a `dist/chat-widget.js` file that can be embedded in any website.

### 3. Embed in Website

Add this to your website's HTML:

```html
<!-- Configuration -->
<script>
  window.ChatWidgetConfig = {
    widgetId: 'your_widget_id',
  };
</script>

<!-- Widget Script -->
<script src="https://your-cdn.com/chat-widget.js"></script>
```

## Configuration

The widget fetches its configuration from your API endpoint:

```
GET {apiUrl}/config/widget?sellerId={sellerId}&widgetId={widgetId}
```

### Expected API Response

```json
{
  "themeColor": "#6366f1",
  "welcomeMessage": "Hi there! How can we help you today?",
  "welcomeMessageIcon": "👋",
  "fallbackMessage": "Sorry, our agents are currently unavailable. Please leave a message and we'll get back to you soon!",
  "position": "bottom-right",
  "showUserStatus": true,
  "showMessageStatus": true,
  "showAgentIcon": true,
  "companyName": "Your Company",
  "agentName": "Support Agent",

  "chatIcon": "message-circle",
  "showChatPrompt": false,
  "chatPromptMessage": "Hi there, have a question? Text us here.",

  "requireUserInfo": true,
  "requiredFields": {
    "name": true,
    "email": true,
    "phone": false
  },
  "userInfoMessage": "Please provide your details to start the conversation:",
  "agentType": "human",
  "openaiConfig": {
    "apiKey": "",
    "model": "gpt-3.5-turbo",
    "systemPrompt": "You are a helpful customer support assistant."
  },
  "customAgentConfig": {
    "webhookUrl": "",
    "headers": {}
  },
  "businessHours": {
    "enabled": false,
    "timezone": "UTC",
    "schedule": {
      "monday": { "enabled": true, "startTime": "09:00", "endTime": "17:00" },
      "tuesday": { "enabled": true, "startTime": "09:00", "endTime": "17:00" },
      "wednesday": { "enabled": true, "startTime": "09:00", "endTime": "17:00" },
      "thursday": { "enabled": true, "startTime": "09:00", "endTime": "17:00" },
      "friday": { "enabled": true, "startTime": "09:00", "endTime": "17:00" },
      "saturday": { "enabled": false, "startTime": "09:00", "endTime": "17:00" },
      "sunday": { "enabled": false}
    }
  }
}

```
### Project Structure

```
src/
├── components/
│   ├── ChatWidget.tsx      # Main widget component
│   └── ui/                 # UI components
├── types/
│   └── chat-config.ts      # TypeScript interfaces
├── api/
│   └── config.ts           # API client
├── styles/
│   └── widget.css          # Widget styles
└── index.ts                # Entry point
```

