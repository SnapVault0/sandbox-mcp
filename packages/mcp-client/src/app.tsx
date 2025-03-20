import React, { useEffect, useState } from "react";
import { MCPClient } from "./client.js";
import { Message } from "./types.js";
import { Chat } from "./ui/chat.js";

interface AppProps {
  client: MCPClient;
}

export const App: React.FC<AppProps> = ({ client }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const connect = async () => {
      try {
        await client.connect();
        setIsConnected(true);
      } catch (error) {
        console.error("Failed to connect:", error);
      }
    };

    connect();
  }, [client]);

  const handleSendMessage = async (content: string) => {
    try {
      await client.sendMessage(content);
      setMessages(client.getMessages());
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  if (!isConnected) {
    return <div>Connecting...</div>;
  }

  return (
    <div className="h-screen">
      <Chat messages={messages} onSendMessage={handleSendMessage} />
    </div>
  );
};
