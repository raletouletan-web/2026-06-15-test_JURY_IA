/**
 * api/auth/me.js — Vercel Serverless Function
 * Vérifie si le cookie de session présent est valide, et renvoie l'email associé.
 */

import jwt from "jsonwebtoken";

const AUTH_SECRET = process.env.AUTH_SECRET;
const SESSION_COOKIE_NAME = "jury_ia_session";

function lireCookie(req, nom) {
  const cookies = req.headers.cookie || "";
  const match = cookies.match(new RegExp(`(?:^|; )${nom}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Méthode non autorisée." });

  if (!AUTH_SECRET) {
    return res.status(500).json({ error: "Configuration serveur incomplète." });
  }

  const sessionToken = lireCookie(req, SESSION_COOKIE_NAME);

  if (!sessionToken) {
    return res.status(401).json({ connecte: false });
  }

  try {
    const payload = jwt.verify(sessionToken, AUTH_SECRET);
    return res.status(200).json({ connecte: true, email: payload.email });
  } catch (err) {
    return res.status(401).json({ connecte: false });
  }
}
