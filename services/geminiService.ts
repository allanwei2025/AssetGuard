import { GoogleGenAI } from "@google/genai";
import { Asset, AssetStatus } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateInventoryReport = async (assets: Asset[]): Promise<string> => {
  if (!apiKey) {
    return "缺少 API 密钥，无法生成 AI 报告。";
  }

  const foundCount = assets.filter(a => a.status === AssetStatus.FOUND).length;
  const missingAssets = assets.filter(a => a.status === AssetStatus.PENDING);
  const extraAssets = assets.filter(a => a.status === AssetStatus.EXTRA);
  
  // Prepare a summary payload for the AI (limit size to avoid token limits if list is huge)
  const summaryPayload = {
    totalAssetsExpected: assets.length - extraAssets.length,
    foundCount,
    missingCount: missingAssets.length,
    extraCount: extraAssets.length,
    missingItemsSample: missingAssets.slice(0, 10).map(a => `${a.name} (${a.location || '未知位置'})`),
    extraItemsSample: extraAssets.slice(0, 10).map(a => `${a.name} (${a.barcode})`),
  };

  const prompt = `
    你是一位专业的资产盘点审计员。请分析以下盘点数据摘要：
    ${JSON.stringify(summaryPayload, null, 2)}

    请为这次资产盘点提供一份简明、专业的执行摘要（请使用中文回答）。
    1. 计算盘点准确率（百分比）。
    2. 针对缺失的资产（“Missing”）指出任何显著的关注点（例如，如果缺失物品在特定位置或类型上有规律）。
    3. 对发现的额外资产（“Extra”）提出后续处理建议。
    4. 保持语气正式且有帮助。
    5. 不要过度使用 Markdown 加粗，保持排版整洁。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "无法生成分析结果。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "由于错误，无法生成 AI 报告。";
  }
};