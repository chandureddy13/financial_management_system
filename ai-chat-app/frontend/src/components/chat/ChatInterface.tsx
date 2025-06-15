import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import ChatHistory from './ChatHistory';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ModelSelector from './ModelSelector';
import { PlusIcon } from '@heroicons/react/24/outline';

const GROQ_MODELS = [
  { id: 'llama3-8b-8192', name: 'Llama 3 8B', description: 'Fast and efficient' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'More capable, slower' },
  { id: 'llama3-70b-8192', name: 'Llama 3 70B', description: 'Most capable' },
];

const ChatInterface: React.FC = () => {
  const { state, createChat, loadChats, sendMessage } = useChat();
  const [selectedModel, setSelectedModel] = useState(GROQ_MODELS[0].id);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  useEffect(() => {
    loadChats();
  }, []);

  const handleCreateChat = async () => {
    setIsCreatingChat(true);
    try {
      await createChat('New Chat', selectedModel);
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!state.currentChat) {
      const chat = await createChat('New Chat', selectedModel);
      await sendMessage(chat._id, content, selectedModel);
    } else {
      await sendMessage(state.currentChat._id, content, selectedModel);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleCreateChat}
            disabled={isCreatingChat}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            {isCreatingChat ? 'Creating...' : 'New Chat'}
          </button>
        </div>
        
        <div className="p-4 border-b border-gray-200">
          <ModelSelector
            models={GROQ_MODELS}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatHistory />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {state.currentChat ? (
          <>
            <div className="flex-1 overflow-hidden">
              <MessageList messages={state.currentChat.messages} />
            </div>
            <div className="border-t border-gray-200 p-4">
              <MessageInput onSendMessage={handleSendMessage} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Welcome to AI Chat</h2>
              <p className="text-lg mb-4">Create a new chat to get started</p>
              <button
                onClick={handleCreateChat}
                disabled={isCreatingChat}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Start Chatting
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;