# WebSocket Chat Initiation Flow

This document outlines the complete flow for initiating a chat session using AWS WebSocket API Gateway with proper contact management and seller assignment.

## Architecture Components

- **Frontend**: Browser WebSocket client
- **AWS API Gateway**: WebSocket endpoint
- **AWS Lambda**: Message handler (`$default` route)
- **Database**: DynamoDB or PHP API backend
- **Seller Assignment**: Custom routing logic

---

## 1. Frontend Implementation

### Initial WebSocket Connection

```javascript
// Initialize WebSocket connection 
const socket = new WebSocket("wss://xx5nmzednd.execute-api.ap-south-1.amazonaws.com/production?userId={deviceId}");

socket.onopen = () => {
    console.log("WebSocket connected");
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
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
};

socket.onerror = (error) => {
    console.error('WebSocket error:', error);
};

socket.onclose = (event) => {
    console.log('WebSocket closed:', event.code, event.reason);
    // Implement reconnection logic if needed
};
```

### Handle Chat Initiation from the widget to seller using device_id when the user submits his details and clicks on the start chat

```javascript
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
```

### Send Messages After Initiation

```javascript
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
```

---

## 2. AWS Lambda Implementation

### Complete Lambda Functions 
### Default Handler

```javascript

// Default Handler
const {DynamoDBClient} = require("@aws-sdk/client-dynamodb")
const {DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb")

exports.handler = async function(event) {
  console.log("🔗 Connect event:", JSON.stringify(event, null, 2));
  
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  
  // Extract userId from query parameters
  const queryParams = event.queryStringParameters || {};
  const userId = queryParams.userId;
  
  if (!userId) {
    console.error("❌ No userId provided in query parameters");
    return {
      statusCode: 400,
      body: "userId query parameter is required"
    };
  }
  
  const command = new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      connectionId: event.requestContext.connectionId,
      userId: userId,
      connectedAt: new Date().toISOString(),
      status: 'connected'
    },
  });

  try {
    await docClient.send(command)
    console.log("✅ Connection stored for user:", userId, "connection:", event.requestContext.connectionId);
  } catch (err) {
    console.log("❌ Connection store error:", err)
    return {
      statusCode: 500
    };
  }
  
  return {
    statusCode: 200,
  };
}

// InitChat Handler
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
  console.log("InitChat triggered:", JSON.stringify(event, null, 2));
  
  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  // Mock the contact_id but here the php call be done
  let contact_id = Math.random().toString(36).substring(2, 15)
  
  let body;
  try {
    body = JSON.parse(event.body || '{}');
    console.log("📥 Parsed body:", body);
  } catch (err) {
    console.error("❌ Invalid JSON in body:", err);
    return { statusCode: 400, body: 'Invalid request body' };
  }
  
  const { sellerId, userInfo } = body;
  
  if (!sellerId || !userInfo) {
    console.error("❌ Missing required fields:", { sellerId, userInfo });
    return { statusCode: 400, body: 'Missing sellerId or userInfo' };
  }
  
  // Update existing connection with additional info
  try {
    await docClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { connectionId },
      UpdateExpression: 'SET sellerId = :sid, userInfo = :ui, contact_id = :cid, updatedAt = :ua',
      ExpressionAttributeValues: {
        ':sid': sellerId,
        ':ui': userInfo,
        ':cid': contact_id, 
        ':ua': new Date().toISOString()
      }
    }));
    
    console.log("✅ Connection updated with user info");
  
  } catch (err) {
    console.error("❌ Failed to update connection:", err);
    return { statusCode: 500, body: 'Failed to update connection' };
  }
  
  
  // ✅ Respond to the client via WebSocket
  const api = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`
  });
  
  
  const responsePayload = {
    action: 'InitChat',
    contact_id: contact_id,
    message: 'Chat initialized successfully',
  };
  
  console.log("📤 Sending response:", responsePayload);
  
  try {
    await api.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(responsePayload)
    }));
    console.log("✅ Ack sent to client");
  } catch (err) {
    console.error("❌ Failed to send Ack to client:", err);
  }
  
  return { statusCode: 200, body: 'InitChat handled' };
};

// sendMessage Handler
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async function(event) {
  console.log("SendMessage triggered:", JSON.stringify(event, null, 2));
  
  const { from , to, message  } = JSON.parse(event.body || '{}');
  const fromConnectionId = event.requestContext.connectionId;


  
  if (!to || !message) {
    return { statusCode: 400, body: "Missing 'to' or 'message'" };
  }

  // Find recipient by userId
  let recipient;
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: "UserIdIndex",
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: {
        ":uid": to,
      }
    }));
    recipient = result.Items[0];
  } catch (err) {
    console.error("❌ Failed to find recipient:", err);
    return { statusCode: 500, body: "Failed to find recipient" };
  }

  if (!recipient || !recipient.connectionId) {
    return { statusCode: 404, body: "User not connected" };
  }

  const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  const callbackAPI = new ApiGatewayManagementApiClient({ endpoint });

  const messagePayload = {
    action: "sendMessage",
    // to:to,
    from: from,
    message,
    timestamp: new Date().toISOString()
  };
  
  try {
    await callbackAPI.send(new PostToConnectionCommand({
      ConnectionId: recipient.connectionId,
      Data: JSON.stringify(messagePayload),
    }));
    console.log("✅ Message sent to:", recipient.connectionId);
  } catch (err) {
    console.error("❌ Failed to send message:", err);
    return { statusCode: 500, body: "Failed to send message" };
  }

  return { statusCode: 200, body: "Message sent successfully" };
}; 

```

### Lambda Environment Variables

```bash
# DynamoDB Tables
CONNECTION_TABLE=seller-connections

# Optional: PHP API 
PHP_API_URL=https://your-php-api.com
PHP_API_KEY=your-api-key
```

---

### DynamoDB schema i have added the chat-system.yaml file


## 5. Complete Flow Summary

### Step-by-Step Process

1. **Frontend Connection**
   - User opens chat widget
   - WebSocket connects to AWS API Gateway
   - Frontend sends `initiateChat` action with user details

2. **Backend Processing**
   - Lambda receives `initiateChat` message
   - Generates unique IDs (contact_id, device_id)
   - Assigns seller using custom logic
   - Stores contact information in database
   - Sends success response with metadata

3. **Frontend Storage**
   - Receives chat initiation confirmation
   - Stores metadata (contact_id, device_id, seller_id) locally
   - Enables chat interface for user

4. **Message Exchange**
   - User sends messages with stored metadata
   - Lambda processes and forwards to assigned seller
   - Stores all messages in database
   - Handles real-time bidirectional communication



