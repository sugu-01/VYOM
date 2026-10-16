import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { queryVectorDatabase } from './src/data/vectorKnowledgeBase.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'operational',
      service: 'VYOM Catastrophe Intelligence Platform',
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      timestamp: new Date().toISOString(),
    });
  });

  // Vector-Augmented Catastrophe Copilot Chat API
  app.post('/api/copilot/chat', async (req, res) => {
    try {
      const { message, assetContext, zoneContext } = req.body;
      const query = message || 'Explain the catastrophe risk for Tamil Nadu';

      // 1. Query internal vector database
      const retrievedChunks = queryVectorDatabase(query, 3);
      const vectorContextText = retrievedChunks
        .map((c, i) => `[Document ${i + 1} - ${c.topic} (${c.subtopic})]:\n${c.content}\nSource: ${c.source}`)
        .join('\n\n');

      const apiKey = process.env.GEMINI_API_KEY;
      const hasValidKey = apiKey && apiKey !== 'MY_GEMINI_API_KEY';

      if (hasValidKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          const systemPrompt = `You are VYOM Underwriter Copilot, an expert geospatial catastrophe risk intelligence assistant dedicated to Tamil Nadu perils (coastal cyclones, estuarine flooding, extreme monsoon deluges, storm surge).

Relevant Catastrophe Vector Database Knowledge:
${vectorContextText}

Active Analysis Context:
${assetContext ? `Selected Asset: ${JSON.stringify(assetContext)}` : 'No specific asset selected.'}
${zoneContext ? `Selected Micro-Zone: ${JSON.stringify(zoneContext)}` : 'State-wide Tamil Nadu perspective.'}

Strict Rules:
1. Ground your answers in the vector knowledge base provided and the application's actual data.
2. Explain actual calculations, vulnerability curves (TN-RCC-2024, TN-Masonry, TN-Industrial-PEB, TN-Agri-Paddy), and model assumptions transparently.
3. Identify missing evidence or uncertainty intervals where appropriate.
4. Do not invent fictitious sensor data or non-existent government alerts.
5. Never autonomously approve, reject, or bind insurance contracts.
6. Always end your response with: "This report supports expert review and is not an automatic underwriting decision."`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: query,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.2, // Low temperature for high factual accuracy in catastrophe risk
            },
          });

          const aiReply = response.text || 'Unable to generate response from model.';
          return res.json({
            reply: aiReply,
            source: 'gemini-3.8-flash (Vector Grounded)',
            retrievedSources: retrievedChunks.map((c) => ({
              title: `${c.topic} — ${c.subtopic}`,
              source: c.source,
            })),
          });
        } catch (apiErr: any) {
          console.warn('Gemini API call failed, falling back to deterministic response:', apiErr.message);
          // Fall through to deterministic response below
        }
      }

      // 2. Deterministic Vector RAG Fallback (if no API key or offline)
      const primaryChunk = retrievedChunks[0];
      const fallbackReply = `[VYOM Deterministic Vector Engine]
Based on verified Tamil Nadu catastrophe records regarding "${query}":

${primaryChunk ? primaryChunk.content : 'Tamil Nadu micro-zones exhibit significant compound risk during Bay of Bengal cyclone season (Oct-Dec Northeast Monsoon).'}

Relevant Model Principles:
• Micro-zone hazard scores incorporate historical storm tracks (Cyclone Michaung 2023, Vardah 2016, 2015 Floods).
• Vulnerability calculations use local structural curves (TN-RCC-2024 for concrete, TN-Industrial-PEB for steel sheds, TN-Masonry for brickwork) rather than generic US FEMA Hazus.
• Loss Anatomy enforces strict monotonicity and transparency from raw precipitation/wind to Expected Annual Loss (EAL).

This report supports expert review and is not an automatic underwriting decision.`;

      return res.json({
        reply: fallbackReply,
        source: 'VYOM Vector Database (Deterministic Fallback)',
        retrievedSources: retrievedChunks.map((c) => ({
          title: `${c.topic} — ${c.subtopic}`,
          source: c.source,
        })),
      });
    } catch (err: any) {
      console.error('Copilot Chat Error:', err);
      res.status(500).json({
        error: 'Catastrophe Copilot encountered an unexpected error.',
        details: err.message,
      });
    }
  });

  // Vite middleware in dev or static files in production
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VYOM] Dev/Prod Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
