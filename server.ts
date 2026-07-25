import express from "express";
import path from "path";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import fs from "fs";

const upload = multer({ dest: "uploads/" });

function getAi() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }
  return new GoogleGenAI({ apiKey: key });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/extract-technicians", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhuma imagem enviada." });
      }

      if (!process.env.GEMINI_API_KEY) {
         return res.status(500).json({ error: "A chave da API do Gemini não está configurada." });
      }

      const filePath = req.file.path;
      const fileData = fs.readFileSync(filePath);
      const mimeType = req.file.mimetype;

      const prompt = `Analise esta imagem e extraia as informações dos técnicos disponíveis.
Retorne um JSON estrito no seguinte formato, e sem texto adicional:
{
  "technicians": [
    {
      "name": "Nome do técnico",
      "region": "Região disponível",
      "notes": "Qualquer anotação ou detalhe adicional"
    }
  ]
}
Se não for possível encontrar essas informações, retorne {"technicians": []}.
O retorno DEVE ser apenas o JSON, sem formatação de código markdown (sem \`\`\`json no início/fim).`;

      const aiClient = getAi();
      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: fileData.toString("base64"),
                  mimeType: mimeType,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      let jsonStr = response.text || "{}";
      
      // Cleanup the uploaded file
      fs.unlinkSync(filePath);
      
      let data = { technicians: [] };
      try {
          data = JSON.parse(jsonStr);
      } catch (parseError) {
          console.error("Error parsing JSON:", parseError);
          // try to clean up markdown if present just in case
          jsonStr = jsonStr.replace(/^```json/g, "").replace(/```$/g, "").trim();
          data = JSON.parse(jsonStr);
      }

      res.json(data);
    } catch (error: any) {
      console.error("Erro na extração:", error);
      res.status(500).json({ error: "Falha ao processar a imagem.", details: error.message });
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
