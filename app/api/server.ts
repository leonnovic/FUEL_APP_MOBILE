/**
 * Vercel Serverless Function for API
 */

import { createServer } from "node:http";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamic import of boot module
const bootPath = resolve(__dirname, "api/boot.js");

// This will be handled by the Vercel build process
// The boot.js file will be executed as a serverless function
export default async function handler(req: Request) {
  try {
    // Import the boot module
    const boot = await import(bootPath);
    const app = boot.default;
    
    // Handle the request
    return app.fetch(req);
  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}