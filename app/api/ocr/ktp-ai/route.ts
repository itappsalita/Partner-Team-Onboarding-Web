import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getErrorMessage } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const apiKey = (process.env.GOOGLE_AI_API_KEY || "").trim();
    if (!apiKey) {
      return NextResponse.json({ error: "API Key Gemini belum dikonfigurasi di server (.env)" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Updated priority list based on verified 2026 model availability
    // 2026 Priority List: Restoring verified IDs and adding preview suffixes
    const modelsToTry = [
      "gemini-3.1-flash-preview",
      "gemini-3-flash-preview",
      "gemini-3-flash",
      "gemini-2.0-flash"
    ];

    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    const prompt = `
      Extract the NIK (16 digits) and Full Name from this Indonesian Identity Card (KTP).
      Return strictly in a valid JSON format only, without Markdown formatting or extra text.
      JSON format:
      {
        "name": "...",
        "nik": "..."
      }
      If any field is unreadable, leave it as an empty string. Ensure the NIK is exactly 16 characters.
    `;

    let result;
    let lastError = "";
    let isQuotaExceeded = false;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying Gemini model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: file.type
            }
          }
        ]);
        if (result) break; // Success!
      } catch (err) {
        const errorMsg = getErrorMessage(err) || "";
        console.warn(`Model ${modelName} call failed:`, errorMsg);
        
        lastError = errorMsg;
        
        // Check specifically for quota/rate limit errors
        if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("limit")) {
          isQuotaExceeded = true;
          // If the most modern model is hit by quota, trying older ones usually fails too, 
          // but we follow through or break early if we prefer. 
          // For now, let's break early if it's a hard Daily Quota limit.
          if (errorMsg.includes("limit: 0")) break; 
        }
        
        continue; 
      }
    }

    if (!result) {
      const status = isQuotaExceeded ? 429 : 500;
      const displayError = isQuotaExceeded 
        ? "Batas penggunaan AI tercapai (Quota Exceeded). Silakan coba lagi nanti atau isi data secara manual."
        : "Semua model Gemini yang dicoba tidak tersedia: " + lastError;

      return NextResponse.json({ 
        error: displayError,
        quotaExceeded: isQuotaExceeded
      }, { status });
    }

    const response = await result.response;
    const text = response.text();
    
    // Clean JSON response (handle occasional markdown wrapping from AI)
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(jsonString);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    const status = (getErrorMessage(error) || "").includes("429") ? 429 : 500;
    return NextResponse.json({ error: "Gagal memproses gambar: " + getErrorMessage(error) }, { status });
  }
}
