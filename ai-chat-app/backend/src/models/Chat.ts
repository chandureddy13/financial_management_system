// backend/src/models/Chat.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokens?: number;
}

export interface IChat extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: IMessage[];
  model: string;
  totalTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  tokens: {
    type: Number,
    default: 0
  }
});

const chatSchema = new Schema<IChat>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  messages: [messageSchema],
  model: {
    type: String,
    required: true
  },
  totalTokens: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

chatSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IChat>('Chat', chatSchema);