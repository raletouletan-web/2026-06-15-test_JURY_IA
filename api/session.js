/**
 * api/session.js — Vercel Serverless Function
 * Endpoint GA OpenAI Realtime : POST /v1/realtime/client_secrets
 */

function getValidTokens() {
  const raw = process.env.VALID_TOKENS || "";
  return raw.split(",").map((t) => t.trim()).filter(Boolean);
}

function isTokenValid(token) {
  if (!token) return false;
  return getValidTokens().includes(token);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée." });

  const token = req.query.token;
  if (!isTokenValid(token)) {
    return res.status(403).json({ error: "Token invalide ou manquant." });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY manquante." });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      // Body minimal — juste model et type
      body: JSON.stringify({
        session: {
          model: "gpt-realtime",
          type: "realtime",
          input_audio_transcription: { model: "whisper-1" },
        },
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      console.error(`❌ OpenAI ${response.status}:`, raw);
      return res.status(response.status).json({
        error: `OpenAI a retourné une erreur ${response.status}`,
        detail: raw,
      });
    }

    const data = await response.json();
    console.log("✅ Ephemeral key générée pour token:", token);
    return res.status(200).json(data);

  } catch (err) {
    console.error("❌ Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
}
