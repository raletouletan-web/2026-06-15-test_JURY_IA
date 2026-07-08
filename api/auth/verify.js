/**
 * api/auth/verify.js — Vercel Serverless Function
 * Vérifie le jeton reçu par lien magique, puis pose un cookie de session (30 jours).
 */

import jwt from "jsonwebtoken";
import { serialize } from "cookie";

const AUTH_SECRET = process.env.AUTH_SECRET;
const SESSION_COOKIE_NAME = "jury_ia_session";
const SESSION_DUREE_JOURS = 30;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée." });

  if (!AUTH_SECRET) {
    console.error("❌ AUTH_SECRET manquant.");
    return res.status(500).json({ error: "Configuration serveur incomplète." });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "Lien de connexion invalide." });
  }

  try {
    // Vérifie le jeton du lien magique (courte durée, 15 minutes)
    const payload = jwt.verify(token, AUTH_SECRET);
    const email = payload.email;

    // Génère un nouveau jeton de session, plus longue durée (30 jours)
    const sessionToken = jwt.sign({ email }, AUTH_SECRET, { expiresIn: `${SESSION_DUREE_JOURS}d` });

    const cookie = serialize(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DUREE_JOURS * 24 * 60 * 60,
    });

    res.setHeader("Set-Cookie", cookie);
    console.log(`✅ Connexion réussie pour ${email}`);

    // Redirige vers l'application (racine), la session est maintenant active via le cookie
    res.writeHead(302, { Location: "/" });
    return res.end();

  } catch (err) {
    console.error("❌ Lien de connexion invalide ou expiré:", err.message);
    // Redirige vers l'accueil avec un paramètre d'erreur que le frontend peut afficher
    res.writeHead(302, { Location: "/?erreur=lien_expire" });
    return res.end();
  }
}
