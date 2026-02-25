import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const FALLBACK_QUESTIONS: Question[] = [
  {
    id: "f1",
    text: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter"],
    correctIndex: 1
  },
  {
    id: "f2",
    text: "What is the capital of France?",
    options: ["London", "Berlin", "Paris"],
    correctIndex: 2
  },
  {
    id: "f3",
    text: "How many continents are there on Earth?",
    options: ["5", "6", "7"],
    correctIndex: 2
  },
  {
    id: "f4",
    text: "Which ocean is the largest?",
    options: ["Atlantic", "Indian", "Pacific"],
    correctIndex: 2
  }
];

export async function generateQuizQuestions(topic: string = "General Knowledge"): Promise<Question[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 4 engaging quiz questions about ${topic}. Each question must have exactly 3 options and one correct answer. The difficulty should be balanced for a live game show.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                minItems: 3,
                maxItems: 3
              },
              correctIndex: { type: Type.INTEGER, description: "0, 1, or 2" }
            },
            required: ["id", "text", "options", "correctIndex"]
          }
        }
      }
    });

    const questions = JSON.parse(response.text || "[]");
    if (Array.isArray(questions) && questions.length === 4) {
      return questions;
    }
    return FALLBACK_QUESTIONS;
  } catch (e) {
    console.error("Failed to generate questions, using fallbacks", e);
    return FALLBACK_QUESTIONS;
  }
}
