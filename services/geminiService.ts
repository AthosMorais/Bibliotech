import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const askLibrarian = async (query: string, inventoryContext: string) => {
  try {
    const model = 'gemini-2.5-flash';
    
    const systemPrompt = `
      Você é um Bibliotecário Virtual inteligente e útil do sistema "BiblioTech".
      
      CONTEXTO DO ACERVO ATUAL:
      ${inventoryContext}
      
      SUAS FUNÇÕES:
      1. Recomendar livros do acervo baseado no gosto do usuário.
      2. Informar se um livro específico está disponível.
      3. Explicar brevemente sobre o conteúdo de um livro do acervo se perguntado.
      4. Ser educado e conciso.
      
      Responda em Português do Brasil.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: [
        { role: 'user', parts: [{ text: query }] }
      ],
      config: {
        systemInstruction: systemPrompt,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Erro ao consultar Gemini:", error);
    return "Desculpe, o sistema de IA está indisponível no momento. Verifique sua chave de API.";
  }
};