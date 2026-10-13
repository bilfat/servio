"use client";

import { useState } from "react";
import { ChatMessage } from "@/components/features/chat/ChatThread";
import { MOCK_CHAT_THREADS } from "@/mocks/chat";

export function useChat(conversationId: string = "order-normal-progress") {
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>(MOCK_CHAT_THREADS);

  const messages = threads[conversationId] || [];

  const sendMessage = (text: string, senderRole: "customer" | "worker" | "support" = "customer", attachment?: { url: string; name: string }) => {
    if (!text.trim() && !attachment) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now().toString().slice(-4)}`,
      senderId: senderRole === "customer" ? "cust-sarah" : senderRole === "worker" ? "worker-budi" : "cs-rina",
      senderName: senderRole === "customer" ? "Sarah Annisa" : senderRole === "worker" ? "Budi Santoso" : "Rina CS",
      senderRole,
      message: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.name,
      isRead: false,
    };

    setThreads((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMsg],
    }));
  };

  const markAllAsRead = () => {
    setThreads((prev) => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map((m) => ({ ...m, isRead: true })),
    }));
  };

  return {
    messages,
    sendMessage,
    markAllAsRead,
    unreadCount: messages.filter((m) => !m.isRead).length,
  };
}
