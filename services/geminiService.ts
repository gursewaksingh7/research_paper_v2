import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// Note: In a real production app, you would proxy this request to avoid exposing keys, 
// or require the user to input their key. For this demo, we assume env var or user input.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const translateText = async (
  text: string, 
  sourceLang: 'en' | 'hi'
): Promise<string> => {
  if (!text || !text.trim()) return "";

  try {
    const ai = getAI();
    const targetLang = sourceLang === 'en' ? 'Hindi' : 'English';
    const sourceLangName = sourceLang === 'en' ? 'English' : 'Hindi';
    
    // We use gemini-3.1-pro-preview for translation
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Translate the following ${sourceLangName} text to ${targetLang} accurately. 
      Do not add explanations, just return the translated text.
      Text: "${text}"`,
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Translation error:", error);
    return ""; // Return empty string on failure to handle gracefully
  }
};