import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

export interface WorkbookData {
  vocabulary: { word: string; meaning: string }[];
  phrases: { english: string; korean: string }[];
  titles: { english: string; korean: string }[];
  detailedStudy: {
    sentence: string;
    slashedEnglish: string;
    syntaxQuestion: string;
    syntaxAnswer: string;
    slashedKorean: string;
    koreanAnswers: string;
    fullKorean: string;
  }[];
  questions: {
    question: string;
    options: { a: string; b: string; c: string; d: string };
    answer: string;
    note?: string;
  }[];
  summary: {
    englishWithBlanks: string;
    englishWords: string[];
    fullEnglish: string;
    koreanWithBlanks: string;
    fullKorean: string;
    timeline: { event: string; subtext: string; icon: string }[];
  };
}

export async function generateWorkbook(passage: string): Promise<WorkbookData> {
  console.log("Generating workbook for passage length:", passage.length);
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const systemInstruction = `You are an expert English teacher. Create a high-quality, professional reading workbook in JSON.
      
      STRICT CONTENT RULES:
      1. VOCABULARY: Exactly 15 essential words from the text with accurate Korean meanings.
      2. PHRASES: 5-8 key phrases for translation practice.
      3. DETAILED STUDY: 
         - Include EVERY sentence from the passage.
         - Use " / " for meaningful chunks.
         - Provide a grammar question (syntaxQuestion) and answer (syntaxAnswer) in Korean for EACH sentence.
         - Korean translation (slashedKorean) must have at least 2 blanks (________).
      4. QUESTIONS: Exactly 5 high-quality multiple-choice comprehension questions.
      5. SUMMARY: 
         - Provide a comprehensive summary (3-5 sentences) that covers the entire passage.
         - englishWords (hint words) MUST be in a RANDOMIZED order, not the same as the answer order.
      
      TECHNICAL RULES:
      - Output ONLY valid JSON.
      - Be descriptive but efficient to avoid truncation.
      - Use ThinkingLevel.LOW to prioritize output completion.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `Generate a comprehensive workbook for this passage:\n${passage}` }]
          }
        ],
        config: {
          temperature: 0,
          systemInstruction,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }, // Minimize reasoning to save tokens for output
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              vocabulary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING, description: "A single English word." },
                    meaning: { type: Type.STRING, description: "Korean meaning." }
                  },
                  required: ["word", "meaning"]
                }
              },
              phrases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    english: { type: Type.STRING },
                    korean: { type: Type.STRING }
                  },
                  required: ["english", "korean"]
                }
              },
              titles: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    english: { type: Type.STRING },
                    korean: { type: Type.STRING }
                  },
                  required: ["english", "korean"]
                }
              },
              detailedStudy: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sentence: { type: Type.STRING },
                    slashedEnglish: { type: Type.STRING },
                    syntaxQuestion: { type: Type.STRING, description: "A grammar question in Korean." },
                    syntaxAnswer: { type: Type.STRING, description: "The answer in Korean." },
                    slashedKorean: { type: Type.STRING },
                    koreanAnswers: { type: Type.STRING, description: "Answers for the blanks in slashedKorean, separated by ' / '." },
                    fullKorean: { type: Type.STRING }
                  },
                  required: ["sentence", "slashedEnglish", "syntaxQuestion", "syntaxAnswer", "slashedKorean", "koreanAnswers", "fullKorean"]
                }
              },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.OBJECT,
                      properties: {
                        a: { type: Type.STRING },
                        b: { type: Type.STRING },
                        c: { type: Type.STRING },
                        d: { type: Type.STRING }
                      },
                      required: ["a", "b", "c", "d"]
                    },
                    answer: { type: Type.STRING },
                    note: { type: Type.STRING }
                  },
                  required: ["question", "options", "answer"]
                }
              },
              summary: {
                type: Type.OBJECT,
                properties: {
                  englishWithBlanks: { type: Type.STRING },
                  englishWords: { type: Type.ARRAY, items: { type: Type.STRING } },
                  fullEnglish: { type: Type.STRING },
                  koreanWithBlanks: { type: Type.STRING },
                  fullKorean: { type: Type.STRING },
                  timeline: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        event: { type: Type.STRING },
                        subtext: { type: Type.STRING },
                        icon: { type: Type.STRING }
                      },
                      required: ["event", "subtext", "icon"]
                    }
                  }
                },
                required: ["englishWithBlanks", "englishWords", "fullEnglish", "koreanWithBlanks", "fullKorean", "timeline"]
              }
            },
            required: ["vocabulary", "phrases", "titles", "detailedStudy", "questions", "summary"]
          }
        }
      });

      console.log("Gemini response received");
      let text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini");
      }

      // Robust JSON extraction
      let cleanJson = "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      } else {
        cleanJson = text;
      }

      try {
        return JSON.parse(cleanJson);
      } catch (parseError) {
        console.error(`JSON Parse Error on attempt ${attempts}. Full text:`, text);
        if (attempts >= maxAttempts) {
          throw new Error("워크북 생성 중 데이터 형식이 올바르지 않습니다. 다시 시도해 주세요.");
        }
        // Continue to next attempt
      }
    } catch (error) {
      console.error(`Error in generateWorkbook on attempt ${attempts}:`, error);
      if (attempts >= maxAttempts) {
        throw error;
      }
    }
  }
  throw new Error("워크북 생성 실패");
}
