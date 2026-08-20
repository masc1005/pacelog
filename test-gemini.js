import { GoogleGenAI } from '@google/genai';

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-pro-latest',
      contents: 'Say hi',
    });
    console.log(response.text);
  } catch (error) {
    console.error('FAILED', error);
  }
}
test();
