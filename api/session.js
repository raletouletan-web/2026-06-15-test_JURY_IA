/**
 * api/session.js — Vercel Serverless Function
 * Charge dynamiquement le référentiel métier et crée la session OpenAI
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

  // ── Bloquer les accès directs depuis un navigateur ──
  if (req.headers["sec-fetch-dest"] === "document") {
    return res.status(403).send(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>Accès refusé</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f7f5f1;margin:0;}
.card{text-align:center;color:#5f6452;}</style></head>
<body><div class="card"><h2>Accès non autorisé</h2><p>Cet endpoint est réservé à l'application.</p></div></body></html>`);
  }

  const token = req.query.token;
  const metier = req.query.metier;

  if (!isTokenValid(token)) {
    return res.status(403).json({ error: "Token invalide ou manquant." });
  }

  if (!metier) {
    return res.status(400).json({ error: "Métier manquant. Sélectionnez un métier." });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY manquante." });
  }

  // ── Charger le référentiel depuis le dossier public ──
  let instructions;
  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const refUrl = `${protocol}://${host}/referentiels/${metier}.json`;

    const refRes = await fetch(refUrl);
    if (!refRes.ok) {
      return res.status(404).json({ error: `Référentiel "${metier}" introuvable.` });
    }
    const referentiel = await refRes.json();
    instructions = referentiel.instructions;

    if (!instructions) {
      return res.status(500).json({ error: `Référentiel "${metier}" invalide (instructions manquantes).` });
    }
  } catch (err) {
    console.error("❌ Erreur chargement référentiel:", err);
    return res.status(500).json({ error: "Impossible de charger le référentiel.", detail: err.message });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          model: "gpt-realtime",
          type: "realtime",
          instructions: instructions,
        },
      }),
    });

    const raw = await response.text();

    if (!response.ok) {
      console.error(`❌ OpenAI ${response.status}:`, raw);
      return res.status(response.status).json({
        error: `OpenAI a retourné une erreur ${response.status}`,
        detail: raw,
      });
    }

    const data = JSON.parse(raw);
    console.log(`✅ Session créée — métier: ${metier}, token: ${token}`);
    return res.status(200).json(data);

  } catch (err) {
    console.error("❌ Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur interne du serveur.", detail: err.message });
  }
}
