// backend/src/services/documentService.ts
import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export class DocumentService {
  static async extractText(filePath: string, mimeType: string): Promise<string> {
    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.extractFromPDF(filePath);
        case 'text/plain':
          return await this.extractFromText(filePath);
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractFromDocx(filePath);
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error: any) {
      console.error('Text extraction error:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  private static async extractFromPDF(filePath: string): Promise<string> {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  }

  private static async extractFromText(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf8');
  }

  private static async extractFromDocx(filePath: string): Promise<string> {
    const dataBuffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    return result.value;
  }

  static async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('File cleanup error:', error);
    }
  }
}