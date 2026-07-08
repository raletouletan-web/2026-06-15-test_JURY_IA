/**
 * api/auth/logout.js — Vercel Serverless Function
 * Supprime le cookie de session.
 */

import { serialize } from "cookie";

const SESSION_COOKIE_NAME = "jury_ia_session";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée." });

  const cookie = serialize(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  res.setHeader("Set-Cookie", cookie);
  return res.status(200).json({ deconnecte: true });
}
