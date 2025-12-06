import { GoogleGenAI, Type } from "@google/genai";
import { DrgRule } from "../types";

const initGenAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const extractClinicalData = async (
  note: string, 
  rule: DrgRule
): Promise<Record<string, number> | null> => {
  const ai = initGenAI();
  if (!ai) return null;

  try {
    const metricProperties: Record<string, any> = {};
    const propertyOrdering: string[] = [];

    // Dynamically build schema based on selected disease rule
    rule.requiredMetrics.forEach(m => {
      metricProperties[m.key] = {
        type: Type.NUMBER,
        description: `患者的 ${m.label}，单位为 ${m.unit}。`,
      };
      propertyOrdering.push(m.key);
    });

    // Add cost if mentioned
    metricProperties['cost'] = {
        type: Type.NUMBER,
        description: "提及的诊疗或药品总费用。"
    };
    propertyOrdering.push('cost');

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `从以下医生填写的中文临床笔记中提取患者 ${rule.diseaseName} 相关的临床指标数据。注意: ${note}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: metricProperties,
          propertyOrdering: propertyOrdering
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    return null;
  }
};