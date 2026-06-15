/**
 * api/session.js — Vercel Serverless Function
 * Remplace le serveur Express pour Vercel
 * Endpoint : GET /api/session?token=XXX
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
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  // Vérification du token
  const token = req.query.token;
  if (!isTokenValid(token)) {
    return res.status(403).json({ error: "Token invalide ou manquant." });
  }

  // Vérification de la clé OpenAI
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY manquante dans les variables Vercel");
    return res.status(500).json({
      error: "OPENAI_API_KEY manquante. Ajoutez-la dans les variables d'environnement Vercel.",
    });
  }

  try {
    // ✅ Bon endpoint + bon modèle OpenAI Realtime
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
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

    const sessionData = await response.json();
    console.log("✅ Session créée pour token:", token, "— expire à:", sessionData.expires_at);

    return res.status(200).json(sessionData);

  } catch (err) {
    console.error("❌ Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
}
