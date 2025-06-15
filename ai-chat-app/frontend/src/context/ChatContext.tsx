// frontend/src/context/ChatContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { chatAPI } from '../services/chat';
import { io, Socket } from 'socket.io-client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokens?: number;
}

interface Chat {
  _id: string;
  title: string;
  messages: Message[];
  model: string;
  totalTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  loading: boolean;
  error: string | null;
  socket: Socket | null;
}

type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'SET_CURRENT_CHAT'; payload: Chat | null }
  | { type: 'ADD_CHAT'; payload: Chat }
  | { type: 'UPDATE_CHAT'; payload: Chat }
  | { type: 'DELETE_CHAT'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: Message } }
  | { type: 'SET_SOCKET'; payload: Socket | null };

const initialState: ChatState = {
  chats: [],
  currentChat: null,
  loading: false,
  error: null,
  socket: null,
};

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CHATS':
      return { ...state, chats: action.payload };
    case 'SET_CURRENT_CHAT':
      return { ...state, currentChat: action.payload };
    case 'ADD_CHAT':
      return { ...state, chats: [action.payload, ...state.chats] };
    case 'UPDATE_CHAT':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat._id === action.payload._id ? action.payload : chat
        ),
        currentChat: state.currentChat?._id === action.payload._id 
          ? action.payload 
          : state.currentChat,
      };
    case 'DELETE_CHAT':
      return {
        ...state,
        chats: state.chats.filter(chat => chat._id !== action.payload),
        currentChat: state.currentChat?._id === action.payload ? null : state.currentChat,
      };
    case 'ADD_MESSAGE':
      const updatedChats = state.chats.map(chat => {
        if (chat._id === action.payload.chatId) {
          return {
            ...chat,
            messages: [...chat.messages, action.payload.message],
          };
        }
        return chat;
      });
      return {
        ...state,
        chats: updatedChats,
        currentChat: state.currentChat?._id === action.payload.chatId
          ? {
              ...state.currentChat,
              messages: [...state.currentChat.messages, action.payload.message],
            }
          : state.currentChat,
      };
    case 'SET_SOCKET':
      return { ...state, socket: action.payload };
    default:
      return state;
  }
};

const ChatContext = createContext<{
  state: ChatState;
  createChat: (title?: string, model?: string) => Promise<Chat>;
  loadChats: () => Promise<void>;
  loadChat: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string, model?: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
} | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { state: authState } = useAuth();

  // Initialize socket connection
  useEffect(() => {
    if (authState.token) {
      const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
        auth: {
          token: authState.token,
        },
      });

      dispatch({ type: 'SET_SOCKET', payload: socket });

      return () => {
        socket.disconnect();
        dispatch({ type: 'SET_SOCKET', payload: null });
      };
    }
  }, [authState.token]);

  const createChat = async (title?: string, model?: string): Promise<Chat> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const chat = await chatAPI.createChat(title, model);
      dispatch({ type: 'ADD_CHAT', payload: chat });
      dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
      return chat;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create chat';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadChats = async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { chats } = await chatAPI.getChatHistory();
      dispatch({ type: 'SET_CHATS', payload: chats });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load chats';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadChat = async (chatId: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const chat = await chatAPI.getChat(chatId);
      dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
      
      // Join socket room for real-time updates
      if (state.socket) {
        state.socket.emit('join-chat', chatId);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load chat';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const sendMessage = async (chatId: string, content: string, model?: string): Promise<void> => {
    // Add user message immediately for better UX
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message: userMessage } });

    try {
      const response = await chatAPI.sendMessage(chatId, content, model);
      
      // Update chat with AI response
      dispatch({ 
        type: 'ADD_MESSAGE', 
        payload: { chatId, message: response.message } 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to send message';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      
      // Add error message
      const errorMsg: Message = {
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message: errorMsg } });
    }
  };

  const deleteChat = async (chatId: string): Promise<void> => {
    try {
      await chatAPI.deleteChat(chatId);
      dispatch({ type: 'DELETE_CHAT', payload: chatId });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete chat';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  return (
    <ChatContext.Provider
      value={{
        state,
        createChat,
        loadChats,
        loadChat,
        sendMessage,
        deleteChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};