/**
 * api/auth/request-link.js — Vercel Serverless Function
 * Reçoit un email, vérifie qu'il correspond à un client valide dans le Google Sheet
 * (publié sur le web au format CSV, lecture simple sans authentification Google),
 * génère un lien de connexion signé (JWT, 15 minutes) et l'envoie par email via Resend.
 */

import jwt from "jsonwebtoken";
import { Resend } from "resend";

const AUTH_SECRET = process.env.AUTH_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const GOOGLE_SHEET_CSV_URL = process.env.GOOGLE_SHEET_CSV_URL;
const APP_URL = process.env.APP_URL || "https://jury-ia.fr";

function isEmailValide(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Parseur CSV minimal (gère les champs simples et les champs entre guillemets)
function parseCSV(texte) {
  const lignes = texte.split(/\r?\n/).filter((l) => l.trim() !== "");
  return lignes.map((ligne) => {
    const champs = [];
    let champActuel = "";
    let dansGuillemets = false;
    for (let i = 0; i < ligne.length; i++) {
      const car = ligne[i];
      if (car === '"') {
        dansGuillemets = !dansGuillemets;
      } else if (car === "," && !dansGuillemets) {
        champs.push(champActuel);
        champActuel = "";
      } else {
        champActuel += car;
      }
    }
    champs.push(champActuel);
    return champs.map((c) => c.trim());
  });
}

async function trouverClientValide(email) {
  // Ajout d'un paramètre unique + no-store pour contourner le cache CDN de Google
  // sur le lien "publié sur le web", qui peut sinon renvoyer une version périmée.
  const urlSansCache = `${GOOGLE_SHEET_CSV_URL}${GOOGLE_SHEET_CSV_URL.includes("?") ? "&" : "?"}_t=${Date.now()}`;
  const reponse = await fetch(urlSansCache, { cache: "no-store" });
  if (!reponse.ok) {
    throw new Error(`Impossible de charger le Google Sheet (${reponse.status})`);
  }
  const texte = await reponse.text();
  const lignes = parseCSV(texte);

  // On suppose une ligne d'en-tête (email, date_expiration) qu'on ignore
  const emailLower = email.trim().toLowerCase();

  for (let i = 1; i < lignes.length; i++) {
    const [rowEmail, dateExpiration] = lignes[i];
    if (!rowEmail) continue;
    if (rowEmail.trim().toLowerCase() === emailLower) {
      if (dateExpiration) {
        const expiration = new Date(dateExpiration);
        const maintenant = new Date();
        if (!isNaN(expiration.getTime()) && expiration < maintenant) {
          return { trouve: true, valide: false }; // abonnement expiré
        }
      }
      return { trouve: true, valide: true };
    }
  }
  return { trouve: false, valide: false };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée." });

  if (!AUTH_SECRET || !RESEND_API_KEY || !GOOGLE_SHEET_CSV_URL) {
    console.error("❌ Variables d'environnement manquantes pour l'authentification.");
    return res.status(500).json({ error: "Configuration serveur incomplète." });
  }

  const { email } = req.body || {};

  if (!email || !isEmailValide(email)) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }

  // Réponse générique dans tous les cas, pour ne pas révéler si l'email existe ou non
  const reponseGenerique = {
    message: "Si cet email correspond à un compte actif, un lien de connexion vient de vous être envoyé.",
  };

  try {
    const { valide } = await trouverClientValide(email);

    if (!valide) {
      console.log(`ℹ️ Tentative de connexion refusée (email non trouvé ou expiré) : ${email}`);
      return res.status(200).json(reponseGenerique);
    }

    // Génère un jeton signé valable 15 minutes
    const token = jwt.sign({ email: email.trim().toLowerCase() }, AUTH_SECRET, { expiresIn: "15m" });
    const lienConnexion = `${APP_URL}/api/auth/verify?token=${encodeURIComponent(token)}`;

    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: "Jury IA <connexion@jury-ia.fr>",
      to: email,
      subject: "Votre lien de connexion à Jury IA",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #5f6452;">Connexion à Jury IA</h2>
          <p>Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien est valable 15 minutes et à usage unique.</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${lienConnexion}" style="background:#5f6452;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Se connecter
            </a>
          </p>
          <p style="color:#888;font-size:13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
        </div>
      `,
    });

    console.log(`✅ Lien de connexion envoyé à ${email}`);
    return res.status(200).json(reponseGenerique);

  } catch (err) {
    console.error("❌ Erreur lors de la demande de lien de connexion:", err);
    // On renvoie quand même une réponse générique pour ne pas fuiter d'information
    return res.status(200).json(reponseGenerique);
  }
}
