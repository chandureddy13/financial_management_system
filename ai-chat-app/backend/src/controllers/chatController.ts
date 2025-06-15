// backend/src/controllers/chatController.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Chat from '../models/Chat';
import { GroqService, ChatMessage } from '../services/groqService';
import { GROQ_MODELS } from '../config/groq';

export class ChatController {
  static async createChat(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, model = GROQ_MODELS.LLAMA3_8B } = req.body;
      const userId = req.user!._id;

      const chat = new Chat({
        userId,
        title: title || 'New Chat',
        messages: [],
        model,
        totalTokens: 0
      });

      await chat.save();
      res.status(201).json(chat);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const { content, model } = req.body;
      const userId = req.user!._id;

      const chat = await Chat.findOne({ _id: chatId, userId });
      if (!chat) {
        res.status(404).json({ error: 'Chat not found' });
        return;
      }

      // Add user message
      const userMessage = {
        role: 'user' as const,
        content,
        timestamp: new Date()
      };
      chat.messages.push(userMessage);

      // Prepare messages for AI
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful, knowledgeable, and friendly AI assistant. Provide accurate and helpful responses.'
        },
        ...chat.messages.slice(-10).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ];

      // Get AI response
      const aiResponse = await GroqService.generateResponse(
        messages,
        model || chat.model
      );

      // Add AI response
      const assistantMessage = {
        role: 'assistant' as const,
        content: aiResponse.content,
        timestamp: new Date(),
        tokens: aiResponse.tokens
      };
      chat.messages.push(assistantMessage);
      chat.totalTokens += aiResponse.tokens;

      await chat.save();

      res.json({
        message: assistantMessage,
        totalTokens: chat.totalTokens
      });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getChatHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!._id;
      const { page = 1, limit = 20 } = req.query;

      const chats = await Chat.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(Number(limit) * Number(page))
        .skip((Number(page) - 1) * Number(limit))
        .select('title updatedAt totalTokens model');

      const total = await Chat.countDocuments({ userId });

      res.json({
        chats,
        totalPages: Math.ceil(total / Number(limit)),
        currentPage: Number(page),
        total
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getChat(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const userId = req.user!._id;

      const chat = await Chat.findOne({ _id: chatId, userId });
      if (!chat) {
        res.status(404).json({ error: 'Chat not found' });
        return;
      }

      res.json(chat);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteChat(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { chatId } = req.params;
      const userId = req.user!._id;

      const chat = await Chat.findOneAndDelete({ _id: chatId, userId });
      if (!chat) {
        res.status(404).json({ error: 'Chat not found' });
        return;
      }

      res.json({ message: 'Chat deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}