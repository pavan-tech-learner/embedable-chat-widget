import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, Check, CheckCheck, Clock, MessageSquare, Phone, Headphones, HelpCircle, Mail } from 'lucide-react';
import { ChatConfig, ChatMessage, UserInfo } from '../types/chat-config';
import { adjustColor } from '../lib/utils';
import UserInfoForm from './widget-ui/UserForm';
import { getDeviceId } from '@/lib/IdGenerator';

interface ChatWidgetProps {
  config: ChatConfig;
  widgetId: string;
  initialMessages?: ChatMessage[];
  isPreview?: boolean;
  className?: string;
}

// Floating particles component for header animation
const FloatingParticles = () => (
  <div className="cwb-floating-particles absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(3)].map((_, i) => (
      <div
        key={i}
        className="cwb-particle absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 2}s`,
          animationDuration: `${2 + Math.random() * 2}s`
        }}
      />
    ))}
  </div>
);

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  config,
  widgetId,
  initialMessages = [],
  isPreview = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(isPreview);
  const [showUserForm, setShowUserForm] = useState(config.requireUserInfo);

  // response id's
  const [_contactId, setContactId] = useState('');
  const [deviceId, setDeviceId] = useState('')

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (config.requireUserInfo) {
      return [];
    }
    return initialMessages.length > 0 ? initialMessages : [
      {
        id: 'welcome',
        text: config.welcomeMessage,
        isUser: false,
        timestamp: new Date(),
        status: 'delivered'
      }
    ];
  });
  const [inputValue, setInputValue] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [connectionType, setConnectionType] = useState<'Live' | '' | ''>('');
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcomeAnimation(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Initialize without WebSocket for now
  useEffect(() => {
    // Set to REST mode by default (no WebSocket backend needed)
    setConnectionType('');
  }, []);

  // Update welcome message when config changes
  useEffect(() => {
    setMessages(prev => prev.map(msg =>
      msg.id === 'welcome' ? { ...msg, text: config.welcomeMessage } : msg
    ));
  }, [config.welcomeMessage]);

  // Reset form when config changes
  useEffect(() => {
    setShowUserForm(config.requireUserInfo);
  }, [config.requireUserInfo]);

  // Simple WebSocket connection attempt
  const tryWebSocketConnection = async () => {
    try {
      const deviceid = await getDeviceId()
      setDeviceId(deviceid);

      // Get WebSocket URL from environment
      let wsUrl = import.meta.env.VITE_SOCKET_API_URL || '';

      if (!wsUrl) {
        console.error('VITE_SOCKET_API_URL is not defined in environment variables');
        setConnectionType('');
        return;
      }

      // Handle protocol conversion
      if (wsUrl.startsWith('https://')) {
        wsUrl = wsUrl.replace('https://', 'wss://');
      } else if (wsUrl.startsWith('http://')) {
        wsUrl = wsUrl.replace('http://', 'ws://');
      } else if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
        // If no protocol specified, assume secure WebSocket
        wsUrl = 'wss://' + wsUrl;
      }

      // Add device ID parameter
      const finalWsUrl = `${wsUrl}?userId=${deviceid}`;

      // Check if WebSocket is supported
      if (typeof WebSocket === 'undefined') {
        console.error('WebSocket is not supported in this browser');
        setConnectionType('');
        return;
      }

      wsRef.current = new WebSocket(finalWsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected successfully!');
        setConnectionType('Live');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("The data came from the socket ", data);

          if (data.action === 'InitChat') {
            const receivedContactId = data.contact_id;
            console.log("The contact id ", receivedContactId);
            setContactId(receivedContactId);
            return;
          }

          // Handle message responses - check for both 'message' type and direct message content
          if (data.type === 'message' || data.message) {
            const messageText = data.message || data.text || 'No message content';

            const newMessage: ChatMessage = {
              id: data.id || Date.now().toString(),
              text: messageText,
              isUser: false,
              timestamp: new Date(),
              status: 'delivered'
            };

            console.log("Adding new message to UI:", newMessage);
            setMessages(prev => {
              const updated = [...prev, newMessage];
              console.log("Updated messages array:", updated);
              return updated;
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('❌ WebSocket connection closed');
        setConnectionType('');
      };

      wsRef.current.onerror = () => {
        console.error('❌ WebSocket connection failed');
        setConnectionType('');
      };

      // Set a timeout to fallback to REST if connection takes too long
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket connection timeout, falling back to REST');
          wsRef.current?.close();
          setConnectionType('');
        }
      }, 5000); // 5 second timeout

    } catch (error) {
      console.log('WebSocket not available, using REST API');
      setConnectionType('');
    }
  };

  // Send message function - tries WebSocket first, then REST
  const sendMessage = async (message: string) => {
    // Try WebSocket first
    if (connectionType === 'Live' && wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const messageData = {
          action: "sendMessage",
          type: 'message',
          from: deviceId,
          to: config.sellerId || "123456",
          message: message,
          timestamp: new Date().toISOString()
        };

        console.log("Sending message via WebSocket:", messageData);
        wsRef.current.send(JSON.stringify(messageData));
        return true;
      } catch (error) {
        console.log('🔄 Falling back to REST API...');
      }
    }

    // Fallback to REST API
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const sellerId = config.sellerId;

      const response = await fetch(`${apiBaseUrl}/sendmessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellerId,
          widgetId,
          message,
          userInfo,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log('Message sent via REST API');

        // Show typing indicator and simulate agent response
        setIsTyping(true);
        setTimeout(() => {
          const responses = [
            "Thanks for reaching out! I'm here to help you. ✨",
            "Great question! Let me get you the perfect solution. 🚀",
            "I'd be happy to assist you with that! 💫",
            "Absolutely! I'm on it right away. 🌟"
          ];

          const agentResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: responses[Math.floor(Math.random() * responses.length)],
            isUser: false,
            timestamp: new Date(),
            status: 'delivered'
          };
          setMessages(prev => [...prev, agentResponse]);
          setIsTyping(false);
        }, 2000);

        return true;
      }
    } catch (error) {
      console.error('REST API send failed:', error);
    }

    return false;
  };

  const handleUserInfoSubmit = (userInfoData: UserInfo) => {
    console.log('🔄 User info submitted, setting up chat...');
    setUserInfo(userInfoData);
    setShowUserForm(false);

    if (connectionType === 'Live' && wsRef.current?.readyState === WebSocket.OPEN) {
      const messageData = {
        action: "InitChat",
        sellerId: config.sellerId || "123456",
        userInfo: userInfoData,
        timestamp: new Date().toISOString()
      };

      wsRef.current.send(JSON.stringify(messageData));
    }

    // Add welcome message
    setMessages([
      {
        id: 'welcome',
        text: config.welcomeMessage,
        isUser: false,
        timestamp: new Date(),
        status: 'delivered'
      }
    ]);
  };

    const handleOpenChat = () => {
    console.log('💬 Chat opened, isPreview:', isPreview);
    setIsOpen(true);

    console.log('🚀 Attempting WebSocket connection (no user info required)...');
    tryWebSocketConnection();
  };

  const handleCloseChat = () => {
    setIsOpen(false);
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, newMessage]);
    const messageText = inputValue;
    setInputValue('');

    // Update to delivered
    setTimeout(() => {
      setMessages(prev => prev.map(msg =>
        msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
      ));
    }, 100);

    // Send message
    const success = await sendMessage(messageText);

    if (success) {
      setTimeout(() => {
        setMessages(prev => prev.map(msg =>
          msg.id === newMessage.id ? { ...msg, status: 'seen' } : msg
        ));
      }, 1000);
    } else {
      // Show error message
      setTimeout(() => {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: config.fallbackMessage || "Sorry, I'm having trouble connecting right now. Please try again.",
          isUser: false,
          timestamp: new Date(),
          status: 'delivered'
        };
        setMessages(prev => [...prev, errorMessage]);
      }, 1000);
    }
  };

  const getPositionClasses = () => {
    switch (config.position) {
      case 'bottom-left':
        return 'bottom-4 left-4 sm:bottom-6 sm:left-6';
      case 'top-right':
        return 'top-4 right-4 sm:top-6 sm:right-6';
      case 'top-left':
        return 'top-4 left-4 sm:top-6 sm:left-6';
      default:
        return 'bottom-4 right-4 sm:bottom-6 sm:right-6';
    }
  };

  const getChatIcon = () => {
    switch (config.chatIcon || 'message-circle') {
      case 'message-square':
        return MessageSquare;
      case 'phone':
        return Phone;
      case 'headphones':
        return Headphones;
      case 'help-circle':
        return HelpCircle;
      case 'mail':
        return Mail;
      default:
        return MessageCircle;
    }
  };

  const ChatIcon = getChatIcon();

  return (
    <>
      {/* Custom CSS for animations and utility classes */}
      <style>{`
        @keyframes cwb-typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }

        @keyframes cwb-messageSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes cwb-buttonPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes cwb-shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }

        @keyframes cwb-slideInUp {
          from {
            transform: translateY(100%) scale(0.8);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        .cwb-message-enter {
          animation: cwb-messageSlideIn 0.4s ease-out forwards;
        }

        .cwb-chat-button-pulse {
          animation: cwb-buttonPulse 2s infinite;
        }

        .cwb-chat-window-enter {
          animation: cwb-slideInUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .cwb-shimmer-bg {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200px 100%;
          animation: cwb-shimmer 2s infinite;
        }

        .cwb-glass-effect {
          backdrop-filter: blur(16px);
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        /* Base utility classes */
        .cwb-fixed { position: fixed; }
        .cwb-relative { position: relative; }
        .cwb-absolute { position: absolute; }
        .cwb-inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
        .cwb-top-1 { top: 0.25rem; }
        .cwb-right-1 { right: 0.25rem; }
        .cwb-top-4 { top: 1rem; }
        .cwb-right-4 { right: 1rem; }
        .cwb-bottom-4 { bottom: 1rem; }
        .cwb-left-4 { left: 1rem; }
        .cwb-bottom-full { bottom: 100%; }
        .cwb-mb-3 { margin-bottom: 0.75rem; }
        .cwb-mb-4 { margin-bottom: 1rem; }
        .cwb--top-1 { top: -0.25rem; }
        .cwb--right-1 { right: -0.25rem; }

        .cwb-w-1 { width: 0.25rem; }
        .cwb-h-1 { height: 0.25rem; }
        .cwb-w-2 { width: 0.5rem; }
        .cwb-h-2 { height: 0.5rem; }
        .cwb-w-3 { width: 0.75rem; }
        .cwb-h-3 { height: 0.75rem; }
        .cwb-w-4 { width: 1rem; }
        .cwb-h-4 { height: 1rem; }
        .cwb-w-5 { width: 1.25rem; }
        .cwb-h-5 { height: 1.25rem; }
        .cwb-w-6 { width: 1.5rem; }
        .cwb-h-6 { height: 1.5rem; }
        .cwb-w-8 { width: 2rem; }
        .cwb-h-8 { height: 2rem; }
        .cwb-w-10 { width: 2.5rem; }
        .cwb-h-10 { height: 2.5rem; }
        .cwb-w-12 { width: 3rem; }
        .cwb-h-12 { height: 3rem; }
        .cwb-w-14 { width: 3.5rem; }
        .cwb-h-14 { height: 3.5rem; }
        .cwb-w-72 { width: 18rem; }
        .cwb-h-80 { height: 20rem; }
        .cwb-w-full { width: 100%; }
        .cwb-h-full { height: 100%; }
        .cwb-max-w-xs { max-width: 20rem; }
        .cwb-max-w-80 { max-width: 20rem; }
        .cwb-min-w-0 { min-width: 0; }
        .cwb-min-w-48 { min-width: 12rem; }

        .cwb-flex { display: flex; }
        .cwb-flex-1 { flex: 1 1 0%; }
        .cwb-flex-col { flex-direction: column; }
        .cwb-flex-row { flex-direction: row; }
        .cwb-flex-row-reverse { flex-direction: row-reverse; }
        .cwb-flex-shrink-0 { flex-shrink: 0; }
        .cwb-items-center { align-items: center; }
        .cwb-justify-center { justify-content: center; }
        .cwb-justify-between { justify-content: space-between; }
        .cwb-justify-start { justify-content: flex-start; }
        .cwb-justify-end { justify-content: flex-end; }

        .cwb-gap-1 { gap: 0.25rem; }
        .cwb-gap-2 { gap: 0.5rem; }
        .cwb-gap-3 { gap: 0.75rem; }
        .cwb-gap-4 { gap: 1rem; }
        .cwb-space-x-2 > * + * { margin-left: 0.5rem; }
        .cwb-space-y-3 > * + * { margin-top: 0.75rem; }
        .cwb-space-y-4 > * + * { margin-top: 1rem; }

        .cwb-p-0\\.5 { padding: 0.125rem; }
        .cwb-p-1 { padding: 0.25rem; }
        .cwb-p-1\\.5 { padding: 0.375rem; }
        .cwb-p-2 { padding: 0.5rem; }
        .cwb-p-3 { padding: 0.75rem; }
        .cwb-p-4 { padding: 1rem; }
        .cwb-p-5 { padding: 1.25rem; }
        .cwb-px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
        .cwb-py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .cwb-pr-6 { padding-right: 1.5rem; }

        .cwb-rounded-full { border-radius: 9999px; }
        .cwb-rounded-lg { border-radius: 0.5rem; }
        .cwb-rounded-md { border-radius: 0.375rem; }
        .cwb-rounded-2xl { border-radius: 1rem; }
        .cwb-rounded-t-2xl { border-top-left-radius: 1rem; border-top-right-radius: 1rem; }
        .cwb-rounded-br-sm { border-bottom-right-radius: 0.125rem; }
        .cwb-rounded-bl-sm { border-bottom-left-radius: 0.125rem; }

        .cwb-border { border-width: 1px; }
        .cwb-border-0 { border-width: 0px; }
        .cwb-border-2 { border-width: 2px; }
        .cwb-border-gray-100 { border-color: rgb(243 244 246); }
        .cwb-border-gray-200 { border-color: rgb(229 231 235); }
        .cwb-border-t { border-top-width: 1px; }

        .cwb-bg-white { background-color: rgb(255 255 255); }
        .cwb-bg-gray-50 { background-color: rgb(249 250 251); }
        .cwb-bg-gray-100 { background-color: rgb(243 244 246); }
        .cwb-bg-red-500 { background-color: rgb(239 68 68); }
        .cwb-bg-green-400 { background-color: rgb(74 222 128); }
        .cwb-bg-white\\/10 { background-color: rgb(255 255 255 / 0.1); }
        .cwb-bg-white\\/20 { background-color: rgb(255 255 255 / 0.2); }

        .cwb-text-white { color: rgb(255 255 255); }
        .cwb-text-gray-400 { color: rgb(156 163 175); }
        .cwb-text-gray-600 { color: rgb(75 85 99); }
        .cwb-text-gray-700 { color: rgb(55 65 81); }

        .cwb-text-xs { font-size: 0.75rem; line-height: 1rem; }
        .cwb-text-sm { font-size: 0.875rem; line-height: 1.25rem; }
        .cwb-text-base { font-size: 1rem; line-height: 1.5rem; }
        .cwb-text-lg { font-size: 1.125rem; line-height: 1.75rem; }
        .cwb-text-xl { font-size: 1.25rem; line-height: 1.75rem; }

        .cwb-font-medium { font-weight: 500; }
        .cwb-font-bold { font-weight: 700; }

        .cwb-shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
        .cwb-shadow-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05); }
        .cwb-shadow-2xl { box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); }

        .cwb-overflow-hidden { overflow: hidden; }
        .cwb-overflow-y-auto { overflow-y: auto; }

        .cwb-pointer-events-none { pointer-events: none; }
        .cwb-cursor-pointer { cursor: pointer; }

        .cwb-z-10 { z-index: 10; }
        .cwb-z-50 { z-index: 50; }

        .cwb-opacity-30 { opacity: 0.3; }
        .cwb-opacity-60 { opacity: 0.6; }
        .cwb-opacity-90 { opacity: 0.9; }

        .cwb-animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .cwb-animate-bounce { animation: bounce 1s infinite; }
        .cwb-animate-ping { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }

        .cwb-transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
        .cwb-transition-colors { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
        .cwb-transition-opacity { transition-property: opacity; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
        .cwb-duration-200 { transition-duration: 200ms; }
        .cwb-duration-300 { transition-duration: 300ms; }
        .cwb-duration-500 { transition-duration: 500ms; }

        .cwb-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cwb-break-words { overflow-wrap: break-word; }

        .cwb-font-sans { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"; }

        .cwb-object-cover { object-fit: cover; }

        .cwb-select-none { user-select: none; }

        .cwb-outline-none:focus { outline: 2px solid transparent; outline-offset: 2px; }
        .cwb-ring-2:focus { --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color); --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color); box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000); }
        .cwb-ring-opacity-50:focus { --tw-ring-opacity: 0.5; }

        .hover\\:cwb-bg-white\\/10:hover { background-color: rgb(255 255 255 / 0.1); }
        .hover\\:cwb-text-gray-600:hover { color: rgb(75 85 99); }
        .hover\\:cwb-opacity-90:hover { opacity: 0.9; }
        .hover\\:cwb-scale-110:hover { transform: scale(1.1); }
        .hover\\:cwb-shadow-3xl:hover { box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25); }

        /* Responsive classes */
        @media (min-width: 640px) {
          .sm\\:cwb-w-80 { width: 20rem; }
          .sm\\:cwb-h-96 { height: 24rem; }
          .sm\\:cwb-w-10 { width: 2.5rem; }
          .sm\\:cwb-h-10 { height: 2.5rem; }
          .sm\\:cwb-w-12 { width: 3rem; }
          .sm\\:cwb-h-12 { height: 3rem; }
          .sm\\:cwb-w-8 { width: 2rem; }
          .sm\\:cwb-h-8 { height: 2rem; }
          .sm\\:cwb-w-6 { width: 1.5rem; }
          .sm\\:cwb-h-6 { height: 1.5rem; }
          .sm\\:cwb-w-5 { width: 1.25rem; }
          .sm\\:cwb-h-5 { height: 1.25rem; }
          .sm\\:cwb-p-4 { padding: 1rem; }
          .sm\\:cwb-p-3 { padding: 0.75rem; }
          .sm\\:cwb-p-2 { padding: 0.5rem; }
          .sm\\:cwb-gap-3 { gap: 0.75rem; }
          .sm\\:cwb-gap-2 { gap: 0.5rem; }
          .sm\\:cwb-text-base { font-size: 1rem; line-height: 1.5rem; }
          .sm\\:cwb-text-lg { font-size: 1.125rem; line-height: 1.75rem; }
          .sm\\:cwb-text-sm { font-size: 0.875rem; line-height: 1.25rem; }
          .sm\\:cwb-max-w-80 { max-width: 20rem; }
          .sm\\:cwb-rounded-3xl { border-radius: 1.5rem; }
          .sm\\:cwb-rounded-t-3xl { border-top-left-radius: 1.5rem; border-top-right-radius: 1.5rem; }
          .sm\\:cwb-space-y-4 > * + * { margin-top: 1rem; }
        }

        @media (min-width: 768px) {
          .md\\:cwb-w-96 { width: 24rem; }
          .md\\:cwb-h-520 { height: 32.5rem; }
          .md\\:cwb-w-12 { width: 3rem; }
          .md\\:cwb-h-12 { height: 3rem; }
          .md\\:cwb-w-10 { width: 2.5rem; }
          .md\\:cwb-h-10 { height: 2.5rem; }
          .md\\:cwb-w-8 { width: 2rem; }
          .md\\:cwb-h-8 { height: 2rem; }
          .md\\:cwb-w-6 { width: 1.5rem; }
          .md\\:cwb-h-6 { height: 1.5rem; }
          .md\\:cwb-p-5 { padding: 1.25rem; }
          .md\\:cwb-gap-4 { gap: 1rem; }
          .md\\:cwb-text-lg { font-size: 1.125rem; line-height: 1.75rem; }
        }

        @media (min-width: 1024px) {
          .lg\\:cwb-w-420 { width: 26.25rem; }
          .lg\\:cwb-h-580 { height: 36.25rem; }
        }
      `}</style>

      <div
        className={`cwb-chat-widget cwb-fixed cwb-font-sans cwb-transition-all cwb-duration-500 ${getPositionClasses()} cwb-z-50 ${className}`}
        style={{
          '--widget-primary': config.themeColor,
        } as React.CSSProperties}
      >
          {/* Responsive Chat Button */}
        {!isOpen && (
          <div className="cwb-closed-widget cwb-relative">
            {/* Chat Prompt Message */}
            {config.showChatPrompt && (
              <div className="cwb-chat-prompt cwb-absolute cwb-bottom-full cwb-right-0 cwb-mb-3 cwb-bg-white cwb-rounded-lg cwb-shadow-lg cwb-p-3 cwb-border cwb-max-w-xs cwb-min-w-48">
                <div className="cwb-text-sm cwb-text-gray-700 cwb-pr-6">{config.chatPromptMessage || 'Hi there, have a question? Text us here.'}</div>
                <button
                  className="cwb-absolute cwb-top-1 cwb-right-1 cwb-text-gray-400 hover:cwb-text-gray-600 cwb-transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <X className="cwb-w-3 cwb-h-3" />
                </button>
                {/* Speech bubble tail */}
                {/* <div className="cwb-absolute cwb-top-full cwb-right-4 cwb-w-0 cwb-h-0"
                     style={{
                       borderLeft: '8px solid transparent',
                       borderRight: '8px solid transparent',
                       borderTop: '8px solid white'
                     }}>
                </div> */}
              </div>
            )}

            <button
              onClick={() => handleOpenChat()}
              className={`
                cwb-w-14 cwb-h-14 cwb-rounded-full cwb-shadow-2xl cwb-transition-all cwb-duration-300
                hover:cwb-scale-110 hover:cwb-shadow-3xl cwb-border-0 cwb-text-white cwb-relative cwb-overflow-hidden
                cwb-flex cwb-items-center cwb-justify-center cwb-cursor-pointer
                ${showWelcomeAnimation ? 'cwb-chat-button-pulse' : ''}
              `}
              style={{
                background: `linear-gradient(135deg, ${config.themeColor} 0%, ${adjustColor(config.themeColor, 20)} 100%)`,
                boxShadow: `0 10px 40px ${config.themeColor}40`
              }}
            >
              <div className="cwb-shimmer-bg cwb-absolute cwb-inset-0 cwb-rounded-full" />
              <ChatIcon className="cwb-w-6 cwb-h-6 cwb-relative cwb-z-10" />

              {/* Notification badge */}
              <div className="cwb-absolute cwb--top-1 cwb--right-1 cwb-w-5 cwb-h-5 cwb-bg-red-500 cwb-rounded-full cwb-flex cwb-items-center cwb-justify-center cwb-text-xs cwb-text-white cwb-font-bold cwb-animate-bounce">
                1
              </div>
            </button>

            {/* Floating ring animation */}
            <div
              className="cwb-absolute cwb-inset-0 cwb-rounded-full cwb-border-2 cwb-animate-ping cwb-opacity-30 cwb-pointer-events-none"
              style={{ borderColor: config.themeColor }}
            />
          </div>
        )}

        {/* Chat Window */}
        {isOpen && (
          <div className="cwb-w-72 cwb-h-80 sm:cwb-w-80 sm:cwb-h-96 md:cwb-w-96 md:cwb-h-520 lg:cwb-w-420 lg:cwb-h-580 cwb-glass-effect cwb-rounded-2xl sm:cwb-rounded-3xl cwb-shadow-2xl cwb-flex cwb-flex-col cwb-overflow-hidden cwb-chat-window-enter">
            {/* Enhanced Header */}
            <div
              className="cwb-chat-header cwb-relative cwb-p-3 sm:cwb-p-4 md:cwb-p-5 cwb-text-white cwb-flex cwb-items-center cwb-justify-between cwb-rounded-t-2xl sm:cwb-rounded-t-3xl cwb-overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${config.themeColor} 0%, ${adjustColor(config.themeColor, 30)} 100%)`
              }}
            >
              <FloatingParticles />

              <div className="cwb-header-content cwb-flex cwb-items-center cwb-gap-2 sm:cwb-gap-3 md:cwb-gap-4 cwb-relative cwb-z-10 cwb-min-w-0 cwb-flex-1">
                {config.showAgentIcon && (
                  <div className="cwb-agent-avatar cwb-flex-shrink-0">
                    {config.companyLogo ? (
                      <div
                        className="cwb-w-8 cwb-h-8 sm:cwb-w-10 sm:cwb-h-10 md:cwb-w-12 md:cwb-h-12 cwb-rounded-full cwb-p-0.5"
                        style={{
                          background: `linear-gradient(45deg, ${config.themeColor}, ${adjustColor(config.themeColor, 40)})`
                        }}
                      >
                        <div className="cwb-w-full cwb-h-full cwb-bg-white cwb-rounded-full cwb-flex cwb-items-center cwb-justify-center">
                          <img
                            src={config.companyLogo}
                            alt="Agent"
                            className="cwb-w-5 cwb-h-5 sm:cwb-w-6 sm:cwb-h-6 md:cwb-w-8 md:cwb-h-8 cwb-rounded-full cwb-object-cover"
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        className="cwb-w-8 cwb-h-8 sm:cwb-w-10 sm:cwb-h-10 md:cwb-w-12 md:cwb-h-12 cwb-rounded-full cwb-flex cwb-items-center cwb-justify-center cwb-text-white cwb-text-sm cwb-font-bold cwb-shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${config.themeColor} 0%, ${adjustColor(config.themeColor, 20)} 100%)`
                        }}
                      >
                        {config.agentName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}

                <div className="cwb-header-text cwb-min-w-0 cwb-flex-1">
                  <div className="cwb-company-name cwb-font-bold cwb-text-sm sm:cwb-text-base md:cwb-text-lg cwb-truncate">
                    {config.companyName}
                  </div>
                  {config.showUserStatus && (
                    <div className="cwb-agent-status cwb-flex cwb-items-center cwb-gap-1 sm:cwb-gap-2 cwb-text-xs sm:cwb-text-sm cwb-opacity-90">
                      <div className="cwb-status-dot cwb-w-2 cwb-h-2 cwb-rounded-full cwb-bg-green-400 cwb-animate-pulse" />
                      <span>{config.agentName} is online</span>
                      <span className="cwb-opacity-60">• {connectionType || 'Live'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="cwb-header-actions cwb-flex cwb-items-center cwb-gap-1 sm:cwb-gap-2 cwb-relative cwb-z-10">
                <button
                  onClick={handleCloseChat}
                  className="cwb-close-btn cwb-p-1.5 sm:cwb-p-2 hover:cwb-bg-white/10 cwb-rounded-full cwb-transition-all cwb-duration-200 hover:cwb-scale-110"
                >
                  <X className="cwb-w-4 cwb-h-4 sm:cwb-w-5 sm:cwb-h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="cwb-messages-area cwb-flex-1 cwb-overflow-y-auto cwb-p-3 sm:cwb-p-4 cwb-space-y-3 sm:cwb-space-y-4 cwb-bg-gray-50">
              {showUserForm ? (
                <UserInfoForm config={config} onSubmit={handleUserInfoSubmit} />
              ) : (
                <>
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`cwb-message cwb-flex cwb-message-enter ${message.isUser ? 'cwb-justify-end' : 'cwb-justify-start'}`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className={`cwb-flex cwb-gap-2 sm:cwb-gap-3 cwb-max-w-xs sm:cwb-max-w-80 ${message.isUser ? 'cwb-flex-row-reverse' : 'cwb-flex-row'}`}>
                        {/* Agent Icon */}
                        {!message.isUser && config.showAgentIcon && (
                          <div className="cwb-flex-shrink-0">
                            {config.companyLogo ? (
                              <div
                                className="cwb-w-6 cwb-h-6 sm:cwb-w-8 sm:cwb-h-8 md:cwb-w-10 md:cwb-h-10 cwb-rounded-full cwb-p-0.5"
                                style={{
                                  background: `linear-gradient(45deg, ${config.themeColor}, ${adjustColor(config.themeColor, 40)})`
                                }}
                              >
                                <div className="cwb-w-full cwb-h-full cwb-bg-white cwb-rounded-full cwb-flex cwb-items-center cwb-justify-center">
                                  <img
                                    src={config.companyLogo}
                                    alt="Agent"
                                    className="cwb-w-4 cwb-h-4 sm:cwb-w-5 sm:cwb-h-5 md:cwb-w-6 md:cwb-h-6 cwb-rounded-full cwb-object-cover"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div
                                className="cwb-w-6 cwb-h-6 sm:cwb-w-8 sm:cwb-h-8 md:cwb-w-10 md:cwb-h-10 cwb-rounded-full cwb-flex cwb-items-center cwb-justify-center cwb-text-white cwb-text-xs sm:cwb-text-sm cwb-font-bold cwb-shadow-lg"
                                style={{
                                  background: `linear-gradient(135deg, ${config.themeColor} 0%, ${adjustColor(config.themeColor, 20)} 100%)`
                                }}
                              >
                                {config.agentName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="cwb-flex cwb-flex-col cwb-gap-1 sm:cwb-gap-2 cwb-min-w-0">
                          <div
                            className={`
                              cwb-px-3 cwb-py-2 cwb-rounded-lg cwb-text-sm cwb-break-words cwb-shadow-sm
                              ${message.isUser
                                ? 'cwb-text-white cwb-rounded-br-sm'
                                : 'cwb-bg-white cwb-text-gray-700 cwb-rounded-bl-sm'
                              }
                            `}
                            style={message.isUser ? { backgroundColor: config.themeColor } : {}}
                          >
                            {message.text}
                          </div>

                          {/* Message Status */}
                          {message.isUser && config.showMessageStatus && message.status && (
                            <div className="cwb-flex cwb-items-center cwb-justify-end cwb-gap-1 cwb-text-xs cwb-text-gray-400">
                              {message.status === 'sending' && <Clock className="cwb-w-3 cwb-h-3" />}
                              {message.status === 'delivered' && <Check className="cwb-w-3 cwb-h-3" />}
                              {message.status === 'seen' && <CheckCheck className="cwb-w-3 cwb-h-3" />}
                              <span className="cwb-text-xs">
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="cwb-flex cwb-justify-start">
                      <div className="cwb-flex cwb-gap-2 sm:cwb-gap-3 cwb-max-w-xs sm:cwb-max-w-80">
                        {config.showAgentIcon && (
                          <div className="cwb-flex-shrink-0">
                            {config.companyLogo ? (
                              <div
                                className="cwb-w-6 cwb-h-6 sm:cwb-w-8 sm:cwb-h-8 md:cwb-w-10 md:cwb-h-10 cwb-rounded-full cwb-p-0.5"
                                style={{
                                  background: `linear-gradient(45deg, ${config.themeColor}, ${adjustColor(config.themeColor, 40)})`
                                }}
                              >
                                <div className="cwb-w-full cwb-h-full cwb-bg-white cwb-rounded-full cwb-flex cwb-items-center cwb-justify-center">
                                  <img
                                    src={config.companyLogo}
                                    alt="Agent"
                                    className="cwb-w-4 cwb-h-4 sm:cwb-w-5 sm:cwb-h-5 md:cwb-w-6 md:cwb-h-6 cwb-rounded-full cwb-object-cover"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div
                                className="cwb-w-6 cwb-h-6 sm:cwb-w-8 sm:cwb-h-8 md:cwb-w-10 md:cwb-h-10 cwb-rounded-full cwb-flex cwb-items-center cwb-justify-center cwb-text-white cwb-text-xs sm:cwb-text-sm cwb-font-bold cwb-shadow-lg"
                                style={{
                                  background: `linear-gradient(135deg, ${config.themeColor} 0%, ${adjustColor(config.themeColor, 20)} 100%)`
                                }}
                              >
                                {config.agentName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="cwb-bg-white cwb-px-3 cwb-py-2 cwb-rounded-lg cwb-rounded-bl-sm cwb-shadow-sm">
                          <div className="cwb-flex cwb-gap-1">
                            {[...Array(3)].map((_, i) => (
                              <div
                                key={i}
                                className="cwb-w-2 cwb-h-2 cwb-bg-gray-400 cwb-rounded-full"
                                style={{
                                  animation: `cwb-typing 1.4s infinite ease-in-out`,
                                  animationDelay: `${i * 0.2}s`
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            {!showUserForm && (
              <div className="cwb-input-area cwb-p-4 cwb-bg-white cwb-border-t cwb-border-gray-100">
                <div className="cwb-input-container cwb-flex cwb-space-x-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="cwb-message-input cwb-flex-1 cwb-px-3 cwb-py-2 cwb-border cwb-border-gray-200 cwb-rounded-full cwb-text-sm focus:cwb-outline-none focus:cwb-ring-2 focus:cwb-ring-opacity-50"
                    style={{
                      '--tw-ring-color': config.themeColor,
                    } as React.CSSProperties}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim()}
                    className="cwb-send-btn cwb-w-10 cwb-h-10 cwb-rounded-full cwb-text-white cwb-flex cwb-items-center cwb-justify-center hover:cwb-opacity-90 cwb-transition-opacity cwb-border-0"
                    style={{ backgroundColor: config.themeColor }}
                  >
                    <Send className="cwb-w-4 cwb-h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ChatWidget;