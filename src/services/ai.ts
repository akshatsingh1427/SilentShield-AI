export interface AIResponse {
  prediction: "PHISHING" | "SAFE";
  confidence: number;
  risk_level: string;
  inference_time_ms: number;
  model: string;
  algorithm: string;
  dataset: string;
  privacy: string;
  keywords: string[];
  explanation: string;
}

export async function analyzeWithAI(
  text: string
): Promise<AIResponse> {

  const response = await fetch("http://127.0.0.1:8000/predict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
    }),
  });

  if (!response.ok) {
    throw new Error("AI server unavailable");
  }

  return response.json();
}