// backend/src/services/groqService.ts
import { groq, GROQ_MODELS } from '../config/groq';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  tokens: number;
  model: string;
}

export class GroqService {
  static async generateResponse(
    messages: ChatMessage[],
    model: string = GROQ_MODELS.LLAMA3_8B,
    maxTokens: number = 1024
  ): Promise<ChatResponse> {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
        top_p: 0.9,
        stream: false
      });

      const response = completion.choices[0]?.message?.content || '';
      const tokens = completion.usage?.total_tokens || 0;

      return {
        content: response,
        tokens,
        model
      };
    } catch (error: any) {
      console.error('Groq API Error:', error);
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  static async summarizeText(
    text: string,
    model: string = GROQ_MODELS.LLAMA3_8B
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant that creates concise summaries of documents. Provide a clear, informative summary that captures the main points.'
      },
      {
        role: 'user',
        content: `Please summarize the following text:\n\n${text}`
      }
    ];

    const response = await this.generateResponse(messages, model, 512);
    return response.content;
  }

  static async analyzeDocument(
    text: string,
    question: string,
    model: string = GROQ_MODELS.LLAMA3_8B
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant that analyzes documents and answers questions based on their content. Only use information from the provided document.'
      },
      {
        role: 'user',
        content: `Document content:\n${text}\n\nQuestion: ${question}`
      }
    ];

    const response = await this.generateResponse(messages, model);
    return response.content;
  }
}