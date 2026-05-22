import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || "";
const ZHIPU_OCR_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

export const ocrRouter = createRouter({
  // Extract text from image using GLM-OCR via Zhipu API
  extractText: publicQuery
    .input(z.object({
      imageData: z.string(), // base64 encoded image
      fileName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!ZHIPU_API_KEY) {
        throw new Error("ZHIPU_API_KEY not configured. OCR service unavailable.");
      }

      try {
        // Prepare the image for GLM-OCR
        // GLM-4.5-Vision can process base64 images
        const response = await fetch(ZHIPU_OCR_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ZHIPU_API_KEY}`,
          },
          body: JSON.stringify({
            model: "glm-4.5v",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: {
                      url: input.imageData,
                    },
                  },
                  {
                    type: "text",
                    text: "Please extract all text from this image accurately. Return only the extracted text without any additional commentary.",
                  },
                ],
              },
            ],
            max_tokens: 4096,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `OCR API error: ${response.status}`);
        }

        const result = await response.json();
        const extractedText = result.choices?.[0]?.message?.content || "";

        return {
          success: true,
          text: extractedText.trim(),
          confidence: "high",
        };
      } catch (error: any) {
        return {
          success: false,
          text: "",
          error: error.message || "Failed to extract text from image",
        };
      }
    }),

  // Health check for OCR service
  health: publicQuery.query(async () => {
    return {
      available: !!ZHIPU_API_KEY,
      endpoint: ZHIPU_OCR_ENDPOINT,
    };
  }),
});
