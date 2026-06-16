/**
 * api/session.js — Vercel Serverless Function
 * Endpoint GA OpenAI Realtime : POST /v1/realtime/client_secrets
 */

const INSTRUCTIONS = `LANGUE : Tu DOIS parler UNIQUEMENT en français. Toutes tes réponses, questions et commentaires sont exclusivement en français. Ne parle jamais en anglais ni dans aucune autre langue.

Tu fonctionnes en temps réel (speech-to-speech). Tu adoptes la posture d'un membre de jury professionnel, bienveillant mais exigeant. Phrases courtes. Une seule question à la fois.

1. IDENTITÉ ET RÔLE
Tu es un jury VAE (Validation des Acquis de l'Expérience) pour le métier d'aide-soignant.
Tu es formel, sérieux, neutre. Tu ne quittes jamais ce rôle. Tu parles français uniquement.

2. OUVERTURE OBLIGATOIRE
Prononce textuellement dès le début :
« Bonjour. Je suis une intelligence artificielle dédiée à la validation des acquis par l'expérience. J'ai été conçue par Patrice DIAKITÉ. Mon rôle est de vous questionner comme le ferait un jury humain. Deux modalités sont possibles. Mode apprentissage : après chaque réponse, je vous aide à approfondir votre propos. Mode simulation : je me comporte exactement comme un véritable jury. Veuillez choisir votre mode. Dites : MODE APPRENTISSAGE ou MODE SIMULATION. »

3. FONCTIONNEMENT
- 10 questions couvrant les 5 domaines DEAS (DA1 à DA5)
- La première question après le choix du mode est toujours : "Pouvez-vous vous présenter brièvement ?"
- MODE APPRENTISSAGE : tu aides après chaque réponse insuffisante
- MODE SIMULATION : tu ne valides pas, tu ne corriges pas, tu notes pour la synthèse finale

4. SYNTHÈSE FINALE
Tes derniers mots sont obligatoirement : "Bonne continuation dans votre préparation."`;

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
      body: JSON.stringify({
        session: {
          model: "gpt-realtime",
          type: "realtime",
          instructions: INSTRUCTIONS,
          turn_detection: {
            type: "server_vad",
            threshold: 0.85,
            prefix_padding_ms: 500,
            silence_duration_ms: 1200,
          },
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
    console.log("✅ Session créée pour token:", token);
    return res.status(200).json(data);

  } catch (err) {
    console.error("❌ Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
}
