
import { GoogleGenAI, Type } from "@google/genai";
import { EntityType, GraphData } from "../types";

export const analyzeNotebookContent = async (content: string): Promise<GraphData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `You are a professional knowledge architect. Analyze the provided text and synthesize a unified knowledge graph.
    
    Guidelines:
    1. Extract key entities: 'Person', 'Concept', 'Data', 'Method', or 'Organization'.
    2. Identify semantic relationships.
    3. Define relationship labels clearly.
    4. Provide a weight (strength) for each link from 1-10.
    5. Ensure each node has a concise description.
    6. Output a single, valid JSON object.
    
    Content:
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
                type: { type: Type.STRING },
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
                source: { type: Type.STRING },
                target: { type: Type.STRING },
                label: { type: Type.STRING },
                strength: { type: Type.NUMBER }
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

export const generateGraphSummary = async (data: GraphData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const nodesSummary = data.nodes.map(n => `${n.label} (${n.type}): ${n.description}`).join('\n');
  const linksSummary = data.links.map(l => `${l.source} -> ${l.label} -> ${l.target}`).join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `You are an expert analyst. Based on this Knowledge Graph (Nodes and Connections), provide a sophisticated, point-wise write-up explaining the graph.
    
    Structure your response as follows:
    1. **Executive Overview**: A high-level summary of the domain.
    2. **Key Entity Clusters**: Describe the most influential nodes and why they are central.
    3. **Primary Relationships**: Explain the most significant connections and how they drive the narrative.
    4. **Synthesis & Implications**: What are the overall conclusions one can draw from this map?
    
    Use bullet points and bold headers for clarity.
    
    GRAPH DATA:
    NODES:
    ${nodesSummary}
    
    CONNECTIONS:
    ${linksSummary}`,
    config: {
      temperature: 0.7,
    }
  });

  return response.text || "Failed to generate summary.";
};
