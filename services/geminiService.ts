import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = 'gemini-3-flash-preview';

export const chatWithAI = async (
    message: string, 
    contextData: string
  ): Promise<string> => {
    try {
      const prompt = `
        Bạn là một trợ lý học tập thông minh (SmartStudy AI).
        Dưới đây là các tài liệu và ghi chú người dùng đã chọn để tham khảo:
        ---
        ${contextData}
        ---
        
        Người dùng hỏi: ${message}
        
        Hãy trả lời dựa trên ngữ cảnh được cung cấp nếu có liên quan. Nếu không, hãy trả lời bằng kiến thức chung. Trả lời bằng tiếng Việt, định dạng Markdown.
      `;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
      });
  
      return response.text || "Xin lỗi, tôi không thể trả lời lúc này.";
    } catch (error) {
      console.error("Chat error:", error);
      return "Đã xảy ra lỗi kết nối với Gemini.";
    }
  };
