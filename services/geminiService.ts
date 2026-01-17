
import { GoogleGenAI, Type } from "@google/genai";
import { EntityType, GraphData } from "../types";

export const analyzeNotebookContent = async (content: string): Promise<GraphData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `You are a professional knowledge architect. Analyze the provided text (which may come from multiple sources/files) and synthesize a unified knowledge graph.
    
    Guidelines:
    1. Extract key entities: 'Person', 'Concept', 'Data', 'Method', or 'Organization'.
    2. Identify semantic relationships between these entities across the entire provided context.
    3. Define relationship labels clearly (e.g., "implements", "founded", "correlates with").
    4. Provide a weight (strength) for each link from 1-10 based on evidence in the text.
    5. Ensure each node has a concise, descriptive 'description' summary.
    6. Ensure the output is a single, valid JSON object following the schema.
    
    Content to Analyze:
    ${content}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                type: { 
                  type: Type.STRING, 
                  description: "One of: Person, Concept, Data, Method, Organization" 
                },
                description: { type: Type.STRING }
              },
              required: ["id", "label", "type", "description"]
            }
          },
          links: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                source: { type: Type.STRING, description: "ID of the source node" },
                target: { type: Type.STRING, description: "ID of the target node" },
                label: { type: Type.STRING, description: "Relationship description" },
                strength: { type: Type.NUMBER, description: "1-10 strength score" }
              },
              required: ["source", "target", "label", "strength"]
            }
          }
        },
        required: ["nodes", "links"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text);
    return data as GraphData;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Invalid graph data received from AI.");
  }
};
