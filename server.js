/**
 * server.js — Backend Express pour le Jury IA VAE (usage local, sans Vercel)
 * Authentification par lien magique (email) + assemblage du référentiel métier.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { Resend } from "resend";

// Petite fonction maison pour construire un en-tête Set-Cookie,
// afin d'éviter les soucis de compatibilité d'export selon la version du package "cookie".
function serializeCookie(nom, valeur, options = {}) {
  let cookie = `${nom}=${encodeURIComponent(valeur)}`;
  if (options.maxAge !== undefined) cookie += `; Max-Age=${Math.floor(options.maxAge)}`;
  if (options.path) cookie += `; Path=${options.path}`;
  if (options.httpOnly) cookie += `; HttpOnly`;
  if (options.secure) cookie += `; Secure`;
  if (options.sameSite) cookie += `; SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`;
  return cookie;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

const AUTH_SECRET = process.env.AUTH_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const GOOGLE_SHEET_CSV_URL = process.env.GOOGLE_SHEET_CSV_URL;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
// URL du frontend (Vite en dev, ou la même que APP_URL en production où tout est servi ensemble)
const FRONTEND_URL = process.env.FRONTEND_URL || APP_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SESSION_COOKIE_NAME = "jury_ia_session";
const SESSION_DUREE_JOURS = 30;

console.log("Variables détectées:", {
  OPENAI_API_KEY: !!OPENAI_API_KEY,
  AUTH_SECRET: !!AUTH_SECRET,
  RESEND_API_KEY: !!RESEND_API_KEY,
  GOOGLE_SHEET_CSV_URL: !!GOOGLE_SHEET_CSV_URL,
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ══════════════════════════════════════════════════════════
// AUTHENTIFICATION PAR LIEN MAGIQUE (EMAIL)
// ══════════════════════════════════════════════════════════

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
  } catch {
    return null;
  }
}

function isEmailValide(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Parseur CSV minimal
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
  if (!reponse.ok) throw new Error(`Impossible de charger le Google Sheet (${reponse.status})`);
  const texte = await reponse.text();
  const lignes = parseCSV(texte);
  const emailLower = email.trim().toLowerCase();

  for (let i = 1; i < lignes.length; i++) {
    const [rowEmail, dateExpiration] = lignes[i];
    if (!rowEmail) continue;
    if (rowEmail.trim().toLowerCase() === emailLower) {
      if (dateExpiration) {
        const expiration = new Date(dateExpiration);
        if (!isNaN(expiration.getTime()) && expiration < new Date()) {
          return { valide: false };
        }
      }
      return { valide: true };
    }
  }
  return { valide: false };
}

// ── POST /api/auth/request-link ──
app.post("/api/auth/request-link", async (req, res) => {
  if (!AUTH_SECRET || !RESEND_API_KEY || !GOOGLE_SHEET_CSV_URL) {
    console.error("❌ Variables d'environnement manquantes pour l'authentification.");
    return res.status(500).json({ error: "Configuration serveur incomplète." });
  }

  const { email } = req.body || {};
  if (!email || !isEmailValide(email)) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }

  const reponseGenerique = {
    message: "Si cet email correspond à un compte actif, un lien de connexion vient de vous être envoyé.",
  };

  try {
    const { valide } = await trouverClientValide(email);
    if (!valide) {
      console.log(`ℹ️ Connexion refusée (email non trouvé ou expiré) : ${email}`);
      return res.status(200).json(reponseGenerique);
    }

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
    return res.status(200).json(reponseGenerique);
  }
});

// ── GET /api/auth/verify ──
app.get("/api/auth/verify", (req, res) => {
  if (!AUTH_SECRET) return res.status(500).json({ error: "Configuration serveur incomplète." });

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Lien de connexion invalide." });

  try {
    const payload = jwt.verify(token, AUTH_SECRET);
    const email = payload.email;

    const sessionToken = jwt.sign({ email }, AUTH_SECRET, { expiresIn: `${SESSION_DUREE_JOURS}d` });
    const cookie = serializeCookie(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: false, // false en local (http), true en production (https)
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DUREE_JOURS * 24 * 60 * 60,
    });

    res.setHeader("Set-Cookie", cookie);
    console.log(`✅ Connexion réussie pour ${email}`);
    res.redirect(FRONTEND_URL + "/");
  } catch (err) {
    console.error("❌ Lien de connexion invalide ou expiré:", err.message);
    res.redirect(FRONTEND_URL + "/?erreur=lien_expire");
  }
});

// ── GET /api/auth/me ──
app.get("/api/auth/me", (req, res) => {
  const email = getEmailDeSession(req);
  if (!email) return res.status(401).json({ connecte: false });
  res.status(200).json({ connecte: true, email });
});

// ── POST /api/auth/logout ──
app.post("/api/auth/logout", (req, res) => {
  const cookie = serializeCookie(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  res.setHeader("Set-Cookie", cookie);
  res.status(200).json({ deconnecte: true });
});

// ══════════════════════════════════════════════════════════
// SESSION OPENAI (référentiel + instructions assemblées)
// ══════════════════════════════════════════════════════════

function remplir(template, referentiel) {
  return template
    .replace(/\{\{nb_questions\}\}/g, referentiel.nb_questions)
    .replace(/\{\{nb_domaines\}\}/g, referentiel.domaines.length)
    .replace(/\{\{duree_max\}\}/g, referentiel.duree_max)
    .replace(/\{\{duree_simulation\}\}/g, referentiel.duree_simulation);
}

function chargerReferentielJSON(nomFichier) {
  const cheminPublic = path.join(__dirname, "public", "referentiels", nomFichier);
  if (!fs.existsSync(cheminPublic)) return null;
  return JSON.parse(fs.readFileSync(cheminPublic, "utf-8"));
}

app.get("/api/session", async (req, res) => {
  const email = getEmailDeSession(req);
  const metier = req.query.metier;

  if (!email) {
    return res.status(403).json({ error: "Session invalide ou expirée. Veuillez vous reconnecter." });
  }
  if (!metier) {
    return res.status(400).json({ error: "Métier manquant. Sélectionnez un métier." });
  }
  if (!OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY manquante.");
    return res.status(500).json({ error: "OPENAI_API_KEY manquante." });
  }

  let instructions;
  try {
    const commun = chargerReferentielJSON("_commun.json");
    const referentiel = chargerReferentielJSON(`${metier}.json`);

    if (!commun) return res.status(500).json({ error: "Fichier _commun.json introuvable." });
    if (!referentiel) return res.status(404).json({ error: `Référentiel "${metier}" introuvable.` });

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
      commun.cloture_entretien,
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
        session: { model: "gpt-realtime", type: "realtime", instructions },
      }),
    });

    const raw = await response.text();
    if (!response.ok) {
      console.error(`❌ OpenAI ${response.status}:`, raw);
      return res.status(response.status).json({ error: `OpenAI a retourné une erreur ${response.status}`, detail: raw });
    }

    const data = JSON.parse(raw);
    console.log(`✅ Session créée — métier: ${metier}, utilisateur: ${email}`);
    res.json(data);
  } catch (err) {
    console.error("❌ Erreur serveur:", err);
    res.status(500).json({ error: "Erreur interne du serveur.", detail: err.message });
  }
});

// ── Healthcheck ──
app.get("/healthz", (_req, res) => {
  res.status(200).json({
    status: "ok",
    apiKey: OPENAI_API_KEY ? "configured" : "missing",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend démarré sur http://localhost:${PORT}`);
  console.log(`   Healthcheck : GET /healthz`);
  console.log(`   Connexion   : POST /api/auth/request-link`);
});
