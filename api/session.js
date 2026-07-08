/**
 * api/session.js — Vercel Serverless Function
 * Assemble le tronc commun (_commun.json) + le référentiel métier choisi.
 * Authentification désormais basée sur le cookie de session (voir api/auth/*),
 * et non plus sur un token passé en paramètre d'URL.
 */

import jwt from "jsonwebtoken";

const AUTH_SECRET = process.env.AUTH_SECRET;
const SESSION_COOKIE_NAME = "jury_ia_session";

function lireCookie(req, nom) {
  const cookies = req.headers.cookie || "";
  const match = cookies.match(new RegExp(`(?:^|; )${nom}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function getEmailDeSession(req) {
  const sessionToken = lireCookie(req, SESSION_COOKIE_NAME);
  if (!sessionToken || !AUTH_SECRET) return null;
  try {
    const payload = jwt.verify(sessionToken, AUTH_SECRET);
    return payload.email || null;
  } catch (err) {
    return null;
  }
}

// Remplace {{nb_questions}}, {{nb_domaines}}, {{duree_max}}, {{duree_simulation}} dans un template
function remplir(template, referentiel) {
  return template
    .replace(/\{\{nb_questions\}\}/g, referentiel.nb_questions)
    .replace(/\{\{nb_domaines\}\}/g, referentiel.domaines.length)
    .replace(/\{\{duree_max\}\}/g, referentiel.duree_max)
    .replace(/\{\{duree_simulation\}\}/g, referentiel.duree_simulation);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée." });

  if (req.headers["sec-fetch-dest"] === "document") {
    return res.status(403).send(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/><title>Accès refusé</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f7f5f1;margin:0;}
.card{text-align:center;color:#5f6452;}</style></head>
<body><div class="card"><h2>Accès non autorisé</h2><p>Cet endpoint est réservé à l'application.</p></div></body></html>`);
  }

  const email = getEmailDeSession(req);
  const metier = req.query.metier;

  if (!email) {
    return res.status(403).json({ error: "Session invalide ou expirée. Veuillez vous reconnecter." });
  }
  if (!metier) {
    return res.status(400).json({ error: "Métier manquant. Sélectionnez un métier." });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY manquante." });
  }

  let instructions;
  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;

    // ── Charger en parallèle le tronc commun + le référentiel métier ──
    const [communRes, metierRes] = await Promise.all([
      fetch(`${protocol}://${host}/referentiels/_commun.json`),
      fetch(`${protocol}://${host}/referentiels/${metier}.json`),
    ]);

    if (!communRes.ok) {
      return res.status(500).json({ error: "Fichier _commun.json introuvable." });
    }
    if (!metierRes.ok) {
      return res.status(404).json({ error: `Référentiel "${metier}" introuvable.` });
    }

    const commun = await communRes.json();
    const referentiel = await metierRes.json();

    // ── Assembler le prompt complet dans l'ordre ──
    instructions = [
      commun.intro,
      "",
      "════════════════════════════════════════════════",
      `PROMPT IA VOCALE — JURY VAE ${referentiel.titre.toUpperCase()}`,
      "Conçu par Patrice DIAKITÉ",
      "════════════════════════════════════════════════",
      "",
      referentiel.identite_role,
      "",
      referentiel.referentiel_evaluation,
      "",
      "3. OUVERTURE OBLIGATOIRE\n(À prononcer textuellement, sans modification, dès le début)\n\n" + commun.ouverture_template,
      "",
      "4. FONCTIONNEMENT PAR MODE\n\n" + remplir(commun.fonctionnement_modes, referentiel),
      "",
      commun.analyse_continue,
      "",
      commun.synthese_finale,
    ].join("\n");

  } catch (err) {
    console.error("❌ Erreur chargement référentiels:", err);
    return res.status(500).json({ error: "Impossible de charger les référentiels.", detail: err.message });
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
    console.log(`✅ Session créée — métier: ${metier}, utilisateur: ${email}`);
    return res.status(200).json(data);

  } catch (err) {
    console.error("❌ Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur interne du serveur.", detail: err.message });
  }
}
