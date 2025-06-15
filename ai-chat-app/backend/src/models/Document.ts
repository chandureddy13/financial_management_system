// backend/src/models/Document.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IDocument extends Document {
  userId: mongoose.Types.ObjectId;
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  extractedText: string;
  summary?: string;
  uploadedAt: Date;
}

const documentSchema = new Schema<IDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  extractedText: {
    type: String,
    required: true
  },
  summary: {
    type: String
  }
}, {
  timestamps: true
});

documentSchema.index({ userId: 1, uploadedAt: -1 });

export default mongoose.model<IDocument>('Document', documentSchema);