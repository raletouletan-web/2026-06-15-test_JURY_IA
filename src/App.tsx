import { useEffect, useRef, useState, useCallback } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";
type InterviewMode = null | "apprentissage" | "simulation";

type Domaine = { code: string; label: string };
type Referentiel = {
  id: string;
  titre: string;
  diplome: string;
  duree_max: number;
  nb_questions: number;
  domaines: Domaine[];
  competences_count: number;
  instructions: string;
};

// Liste des métiers disponibles (doit correspondre aux fichiers dans /referentiels/)
const METIERS: { id: string; titre: string; diplome: string }[] = [
  { id: "aide-soignant",          titre: "Aide-Soignant",            diplome: "DEAS" },
   { id: "auxiliaire-de-puericulture",            titre: "Auxiliaire de puericulture",              diplome: "DEAP"  },
  { id: "accompagnant-educatif-petite-enfance", titre: "Accompagnant Éducatif Petite Enfance", diplome: "CAP AEPE" },
{ id: "educateur-jeunes-enfants", titre: "Éducateur de Jeunes Enfants", diplome: "DEEJE" },
  { id: "educateur-specialise", titre: "Éducateur Spécialisé", diplome: "DEES" },
  { id: "moniteur-educateur", titre: "Moniteur Éducateur", diplome: "DEME" },
  { id: "bts-mco", titre: "BTS MCO", diplome: "BTS MCO" },
     { id: "charge-ressources-humaines", titre: "chargé des ressources humaines", diplome: "Chargé des ressources humaines" },
     { id: "bts-sam", titre: "bts-sam", diplome: "BTS Support à l'Action Managériale" },
     { id: "but-informatique", titre: "but-informatique", diplome: "Bachelor Universitaire de Technologie en Informatique" },
     { id: "bts-cg", titre: "bts-cg", diplome: "BTS Comptabilité Gestion" },
     { id: "bts-pi", titre: "bts-pi", diplome: "BTS Professions Immobilières" },
     { id: "bts-gtla", titre: "bts-gtla", diplome: "BTS Gestion des Transports et Logistique Associée" },
     { id: "bts-mhr", titre: "bts-mhr", diplome: "BTS Management en Hôtellerie-Restauration" },
     { id: "bts-fee", titre: "bts-fee", diplome: "BTS Fluides, Énergies, Environnements" },
     { id: "bts-electrotechnique", titre: "bts-electrotechnique", diplome: "BTS Électrotechnique" },
     { id: "bts-crci", titre: "bts-crci", diplome: "BTS Conception et Réalisation en Chaudronnerie Industrielle" },
     { id: "bts-ms", titre: "bts-ms", diplome: "BTS Maintenance des Systèmes" },
     { id: "bpjeps-asec", titre: "bpjeps-asec", diplome: "BPJEPS - Mention Animation Socio-éducative ou Culturelle" },
     { id: "accompagnant-educatif-et-social", titre: "Accompagnant Educatif et Social", diplome: "DEAES" },
  // ── Ajouter ici les autres métiers au fur et à mesure ──
];

type Categorie = {
  id: string;
  titre: string;
  description: string;
  icon: string;
  metiers: string[]; // doit correspondre aux id de METIERS
};

const CATEGORIES: Categorie[] = [
  {
    id: "petite-enfance-social",
    titre: "Petite Enfance & Social",
    description: "CAP AEPE, DEEJE, DEES, DEME...",
    icon: "🧸",
    metiers: [
      "accompagnant-educatif-petite-enfance",
      "educateur-jeunes-enfants",
      "educateur-specialise",
      "moniteur-educateur",
    ],
  },
  {
    id: "sanitaire-paramedical",
    titre: "Sanitaire & Paramédical",
    description: "Aide-Soignant, Auxiliaire de Puériculture, Accompagnant Educatif et Social...",
    icon: "🩺",
    metiers: ["aide-soignant", "auxiliaire-de-puericulture","accompagnant-educatif-et-social"],
  },
  {
    id: "commerce-vente",
    titre: "Commerce & Vente",
    description: "BTS MCO, NDRC, Licence Pro Commerce...",
    icon: "🛍️",
    metiers: ["bts-mco"],
  },
  {
    id: "ressources-humaines-paie",
    titre: "Ressources Humaines & Paie",
    description: "Titre RH, Gestionnaire de Paie, Master RH...",
    icon: "👥",
    metiers: ["charge-ressources-humaines"],
  },
  {
    id: "management-direction",
    titre: "Management & Direction",
    description: "BTS SAM, Direction d'établissement, Chef de projet...",
    icon: "💼",
    metiers: ["bts-sam"],
  },
  {
    id: "informatique-digital",
    titre: "Informatique & Digital",
    description: "BUT informatique, Concepteur Développeur, RSSI, Chef d'équipe...",
    icon: "💻",
    metiers: ["but-informatique"],
  },
  {
    id: "comptabilite-gestion",
    titre: "Comptabilité & Gestion",
    description: "DCG, DSCG, Assistant Comptable...",
    icon: "🧮",
    metiers: ["bts-cg"],
  },
  {
    id: "immobilier-notariat",
    titre: "Immobilier & Notariat",
    description: "BTS PI, Négociateur, Gestionnaire de biens...",
    icon: "🏢",
    metiers: ["bts-pi"],
  },
  {
    id: "logistique-transport",
    titre: "Logistique & Transport",
    description: "Supply Chain, BTS GTLA...",
    icon: "🚚",
    metiers: ["bts-gtla"],
  },
  {
    id: "hotellerie-restauration",
    titre: "Hôtellerie & Restauration",
    description: "BTS MHR, Chef de Cuisine, Maître d'Hôtel...",
    icon: "🍽️",
    metiers: ["bts-mhr"],
  },
  {
    id: "industrie-ingenierie",
    titre: "Industrie & Ingénierie",
    description: "Maintenance, Ingénieur Cnam...",
    icon: "⚙️",
    metiers: ["bts-electrotechnique","bts-crci","bts-fee","bts-ms"],
  },
  {
    id: "sport-animation",
    titre: "Sport & Animation",
    description: "BPJEPS, DEJEPS, Licence STAPS...",
    icon: "🤸",
    metiers: ["bpjeps-asec"],
  },
  // ── Ajouter ici les futures catégories (Commerce & Vente, RH & Paie, etc.) ──
];

const WEBRTC_URL = "https://api.openai.com/v1/realtime/calls";
const MODEL      = "gpt-realtime";

// ── L'accès est désormais géré par cookie de session (voir /api/auth/*) ──

// Les instructions sont chargées dynamiquement depuis le référentiel choisi
const INSTRUCTIONS_PLACEHOLDER = `LANGUE : Tu DOIS parler UNIQUEMENT en français. Toutes tes réponses, questions et commentaires sont exclusivement en français. Ne parle jamais en anglais ni dans aucune autre langue.

Tu fonctionnes en temps réel (speech-to-speech). Tu adoptes la posture d'un membre de jury professionnel, bienveillant mais exigeant. Phrases courtes. Une seule question à la fois.

════════════════════════════════════════════════
PROMPT IA VOCALE — JURY VAE AIDE-SOIGNANT
Conçu par Patrice DIAKITÉ
════════════════════════════════════════════════

1. IDENTITÉ ET RÔLE
Tu es un jury VAE (Validation des Acquis de l'Expérience) pour le métier "selectionné"
Tu es formel, sérieux, neutre.
Tu ne quittes jamais ce rôle.
Tu parles français uniquement.
Tu utilises des phrases courtes pour une meilleure compréhension orale.

2. RÉFÉRENTIEL D'ÉVALUATION
Tu évalues le candidat sur les domaines d'activités (DA) et les compétences officielles du Diplôme :

3. OUVERTURE OBLIGATOIRE
(À prononcer textuellement, sans modification, dès le début)

« Bonjour. Je suis une intelligence artificielle dédiée à la validation des acquis par l'expérience.
Mon rôle est de vous questionner comme le ferait un jury humain.
Deux modalités sont possibles. Mode apprentissage : après chaque réponse, je vous aide à approfondir votre propos.
Mode simulation : je me comporte exactement comme un véritable jury.
Veuillez choisir votre mode. Dites : MODE APPRENTISSAGE ou MODE SIMULATION. »

Tu dois attendre la réponse du candidat.

Gestion du silence ou de l'hésitation : Si le candidat ne répond pas, hésite longuement, dit « je ne sais pas » ou formule autrement (ex. : « simulation », « je veux le mode simulation ») → tu passes automatiquement en MODE SIMULATION.
SI LE CANDIDAT DIT « TEST JURY », va directement à la synthèse finale en improvisant des axes d'amélioration. C'est un test de l'outil.

La première question après le choix du mode est toujours : "Pouvez-vous vous présenter brièvement ?"
Tu utiliseras le prénom du candidat pour personnaliser tes questions lorsque c'est nécessaire.

4. FONCTIONNEMENT PAR MODE

MODE APPRENTISSAGE
Structure : 10 questions couvrant les 5 domaines. Les questions devront être variées et pas dans un ordre défini. Durée max : 20 minutes.
À chaque réponse :
- Réponse complète et précise → validation brève + question suivante.
- Réponse insuffisante, floue ou incomplète → tu expliques poliment ce qui manque. Tu poses une seule question d'aide. Quelle que soit la réponse → tu passes à la question suivante.
- Réponse hors sujet ou incohérente → tu reformules la question une fois.
Règle clé : tu accompagnes sans donner la solution. Maximum 2 aides par question.

MODE SIMULATION
Structure : 10 questions couvrant les 5 domaines. Durée max : 15 minutes.
À chaque réponse :
- Tu ne valides pas. Tu ne corriges pas. Tu ne donnes aucune aide.
- Tu peux rebondir pour creuser.
Tu notes en continu pour la synthèse finale.

RÈGLES COMMUNES :
- Changement de mode en cours : impossible.
- Si le candidat veut arrêter : tu conclus et termines.
- Si le candidat reste sans réponse longuement : tu stoppes la session.

5. ANALYSE EN CONTINU (les deux modes)
Tu évalues silencieusement : vocabulaire technique, profondeur des réponses, pertinence des exemples, véracité des gestes.
En mode apprentissage : tu corriges les erreurs graves au fil de l'entretien.
En mode simulation : tu conserves les erreurs pour la synthèse finale uniquement.

6. SYNTHÈSE FINALE — RÈGLES ABSOLUES
Structure de la synthèse (maximum 500 mots) :
1. Impression générale : 2-3 phrases. Commencer par un point positif.
2. Ce que le jury a perçu comme solide : 2-4 compétences bien démontrées.
3. Ce qui mérite d'être renforcé : 2-3 conseils concrets.
4. Point de vigilance : uniquement si écart significatif détecté.
5. Conseil de préparation : 1 action prioritaire concrète.
6. Verdict simulé : exactement l'une de ces trois phrases :
   - "Profil favorable à la validation"
   - "Profil à compléter — quelques ajustements suffisent"
   - "Préparation à poursuivre — des écarts importants subsistent"

RÈGLES ABSOLUES PENDANT LA SYNTHÈSE :
- Tu lis la synthèse intégralement du début à la fin SANS T'ARRÊTER.
- Si le candidat parle, t'interrompt ou pose une question : tu l'IGNORES TOTALEMENT.
- Tu continues sans répondre, sans t'arrêter, sans commenter l'interruption.
- Tes DERNIERS MOTS sont obligatoirement : "Bonne continuation dans votre préparation."
- Tu ne prononces RIEN après cette phrase.`;

function pcm16Base64ToAudioBuffer(base64: string, ctx: AudioContext): AudioBuffer | null {
  try {
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pcm     = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) float32[i] = pcm[i] / 32768.0;
    const buf = ctx.createBuffer(1, float32.length, 24000);
    buf.copyToChannel(float32, 0);
    return buf;
  } catch { return null; }
}
export default function App() {
  const [status,      setStatus]      = useState<ConnectionStatus>("idle");
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [seconds,     setSeconds]     = useState(0);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [mode,        setMode]        = useState<InterviewMode>(null);
  const [questionNum, setQuestionNum] = useState(0);
  const [synthesis,   setSynthesis]   = useState<string | null>(null);
  const [metierSelectionne, setMetierSelectionne] = useState<string | null>(null);
  const [categorieSelectionnee, setCategorieSelectionnee] = useState<string | null>(null);
  const [referentiel, setReferentiel] = useState<Referentiel | null>(null);
  const [loadingMetier, setLoadingMetier] = useState(false);

  // ── Authentification par lien magique (email) ──
  const [authChecked, setAuthChecked] = useState(false);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginStatus, setLoginStatus] = useState<"idle" | "envoi" | "envoye" | "erreur">("idle");
  const [loginErrorMsg, setLoginErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Si on arrive avec ?erreur=lien_expire (redirection depuis /api/auth/verify), on l'affiche
    const params = new URLSearchParams(window.location.search);
    if (params.get("erreur") === "lien_expire") {
      setLoginStatus("erreur");
      setLoginErrorMsg("Ce lien de connexion a expiré ou est invalide. Merci de redemander un nouveau lien.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data) => {
        if (data.connecte) setAuthEmail(data.email);
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  const demanderLienConnexion = async () => {
    if (!loginEmail || loginStatus === "envoi") return;
    setLoginStatus("envoi");
    setLoginErrorMsg(null);
    try {
      const res = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: loginEmail.trim() }),
      });
      if (!res.ok) throw new Error("Erreur lors de l'envoi.");
      setLoginStatus("envoye");
    } catch (err) {
      setLoginStatus("erreur");
      setLoginErrorMsg("Une erreur est survenue. Merci de réessayer dans quelques instants.");
    }
  };

  const deconnecter = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {}
    setAuthEmail(null);
    setLoginEmail("");
    setLoginStatus("idle");
    setMetierSelectionne(null);
    setCategorieSelectionnee(null);
    setReferentiel(null);
  };

  // ── Nouveau flux : clôture de l'entretien → écriture de la synthèse (texte) → lecture (audio) ──
  const interviewClosedRef = useRef(false);
  const synthesisPhaseRef  = useRef<"idle" | "writing" | "reading" | "done">("idle");
  const synthesisTextRef   = useRef("");
  const communRef = useRef<{ synthese_ecriture?: string; synthese_lecture?: string; cloture_entretien?: string } | null>(null);

  // ── NOUVEAU : verrou anti-interruption pendant que l'IA parle ──
  const isAISpeakingRef = useRef(false);

  const INACTIVITY_THRESHOLD = 90;
  const COUNTDOWN_DURATION   = 15;
  const [inactivitySec,  setInactivitySec]  = useState(0);
  const [showInactivity, setShowInactivity] = useState(false);
  const [countdown,      setCountdown]      = useState(COUNTDOWN_DURATION);

  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const dcRef          = useRef<RTCDataChannel | null>(null);
  const micStreamRef   = useRef<MediaStream | null>(null);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const audioQueueRef  = useRef<AudioBuffer[]>([]);
  const isPlayingRef   = useRef(false);
  const timerRef       = useRef<number | null>(null);
  const transcriptRef  = useRef<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isConnected  = status === "connected";
  const isConnecting = status === "connecting";

  // ── Chargement du référentiel depuis /referentiels/<id>.json ──
  const chargerReferentiel = async (metierId: string) => {
    setLoadingMetier(true);
    try {
      const res = await fetch(`/referentiels/${metierId}.json`);
      if (!res.ok) throw new Error("Référentiel introuvable");
      const data: Referentiel = await res.json();
      setReferentiel(data);
      setMetierSelectionne(metierId);
    } catch (err) {
      setErrorMsg("Impossible de charger le référentiel. Vérifiez la connexion.");
    } finally {
      setLoadingMetier(false);
    }
  };

  // ── Charge une fois les textes communs (dont les instructions de synthèse écrite/lue) ──
  useEffect(() => {
    fetch("/referentiels/_commun.json")
      .then((r) => r.json())
      .then((data) => { communRef.current = data; })
      .catch(() => { /* on retombera sur un texte de repli si absent */ });
  }, []);

  useEffect(() => {
    if (isConnected) {
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setSeconds(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected) {
      setInactivitySec(0); setShowInactivity(false); setCountdown(COUNTDOWN_DURATION);
      return;
    }
    const id = window.setInterval(() => setInactivitySec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isConnected]);

  useEffect(() => {
    if (isSpeaking || isListening) {
      setInactivitySec(0); setShowInactivity(false); setCountdown(COUNTDOWN_DURATION);
    }
  }, [isSpeaking, isListening]);

  useEffect(() => {
    if (!isConnected) return;
    if (inactivitySec >= INACTIVITY_THRESHOLD && !showInactivity) {
      setShowInactivity(true); setCountdown(COUNTDOWN_DURATION); return;
    }
    if (showInactivity) {
      if (countdown <= 0) { stopInterview(); return; }
      const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inactivitySec, showInactivity, countdown, isConnected]);

  const continueSession = useCallback(() => {
    setInactivitySec(0); setShowInactivity(false); setCountdown(COUNTDOWN_DURATION);
  }, []);

  useEffect(() => {
    const last = messages.filter((m) => m.role === "user").slice(-1)[0];
    if (!last || mode) return;
    const t = last.text.toLowerCase();
    if (t.includes("apprentissage")) setMode("apprentissage");
    else if (t.includes("simulation")) setMode("simulation");
  }, [messages, mode]);

  useEffect(() => {
    const juryMsgs = messages.filter((m) => m.role === "assistant" && m.text.includes("?"));
    setQuestionNum(Math.min(juryMsgs.length, 10));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (s: number) => {
    const m   = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const progressPct = Math.min((seconds / 1200) * 100, 100);
  const timeWarning = seconds >= 1080;

  const disconnectSession = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    audioQueueRef.current = [];
    isPlayingRef.current  = false;
    isAISpeakingRef.current = false;
    pcRef.current = dcRef.current = micStreamRef.current = audioCtxRef.current = null;
    transcriptRef.current = {};
    const el = document.getElementById("jury-audio") as HTMLAudioElement | null;
    if (el) el.srcObject = null;
    setStatus("idle");
    setIsSpeaking(false);
    setIsListening(false);
  }, []);

  const playNextChunk = useCallback(() => {
    if (!audioCtxRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current    = false;
      isAISpeakingRef.current = false; // ── L'IA a fini de parler → micro réactivé
      setIsSpeaking(false);
      return;
    }
    isPlayingRef.current    = true;
    isAISpeakingRef.current = true;  // ── L'IA commence à parler → verrou ON
    setIsSpeaking(true);
    const buf    = audioQueueRef.current.shift()!;
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buf;
    source.connect(audioCtxRef.current.destination);
    source.onended = playNextChunk;
    source.start();
  }, []);

  const enqueueAudio = useCallback((base64: string) => {
    if (!audioCtxRef.current) return;
    const buf = pcm16Base64ToAudioBuffer(base64, audioCtxRef.current);
    if (!buf) return;
    audioQueueRef.current.push(buf);
    if (!isPlayingRef.current) playNextChunk();
  }, [playNextChunk]);

  const sendEvent = useCallback((event: object) => {
    if (dcRef.current?.readyState === "open") dcRef.current.send(JSON.stringify(event));
  }, []);

  const upsertMessage = useCallback((id: string, role: "user" | "assistant", text: string) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], text }; return next; }
      return [...prev, { id, role, text }];
    });
  }, []);

  const handleServerEvent = useCallback((raw: string) => {
    let event: any;
    try { event = JSON.parse(raw); } catch { return; }

    switch (event.type) {

      case "session.created":
        sendEvent({
          type: "session.update",
          session: {
            type: "realtime",
            instructions: referentiel?.instructions || "",
          },
        });
        sendEvent({ type: "response.create" });
        break;

      case "response.audio.delta":
        // ── Dès le 1er chunk audio → verrou ON immédiatement ──
        isAISpeakingRef.current = true;
        enqueueAudio(event.delta);
        break;

      case "response.output_audio.delta":
        isAISpeakingRef.current = true;
        enqueueAudio(event.delta);
        break;

      case "response.output_audio_transcript.delta": {
        const id  = event.item_id || "assistant";
        const txt = (transcriptRef.current[id] || "") + (event.delta || "");
        transcriptRef.current[id] = txt;
        upsertMessage(id, "assistant", txt);

        if (!interviewClosedRef.current) {
          const low = txt.toLowerCase();
          if (
            low.includes("entretien est terminé") ||
            low.includes("entretien est termine")
          ) {
            interviewClosedRef.current = true;
            // ── Coupe le micro côté client ──
            if (micStreamRef.current) {
              micStreamRef.current.getTracks().forEach((track) => {
                track.enabled = false;
              });
            }
            if (dcRef.current?.readyState === "open") {
              dcRef.current.send(JSON.stringify({ type: "input_audio_buffer.clear" }));
              // ── Désactive complètement la détection de parole côté serveur : plus aucun ──
              // ── son ne peut interrompre l'écriture puis la lecture de la synthèse ──
              dcRef.current.send(JSON.stringify({
                type: "session.update",
                session: { type: "realtime", audio: { input: { turn_detection: null } } },
              }));
            }
          }
        }
        break;
      }

      case "response.output_audio_transcript.done": {
        const id = event.item_id || "assistant";
        if (event.transcript) {
          transcriptRef.current[id] = event.transcript;
          upsertMessage(id, "assistant", event.transcript);
        }

        // ── L'entretien vient d'être clôturé (phrase de fin terminée) → on demande la synthèse écrite ──
        if (interviewClosedRef.current && synthesisPhaseRef.current === "idle") {
          synthesisPhaseRef.current = "writing";
          sendEvent({
            type: "response.create",
            response: {
              output_modalities: ["text"],
              instructions:
                communRef.current?.synthese_ecriture ||
                "Rédige par écrit la synthèse finale de l'entretien qui vient de se dérouler.",
            },
          });
        }
        // ── La lecture audio de la synthèse vient de se terminer → on referme la session ──
        else if (synthesisPhaseRef.current === "reading") {
          synthesisPhaseRef.current = "done";
          setTimeout(disconnectSession, 3000);
        }
        break;
      }

      case "response.output_text.delta": {
        synthesisTextRef.current += event.delta || "";
        break;
      }

      case "response.output_text.done": {
        // ── La synthèse est ENTIÈREMENT écrite : on l'affiche immédiatement, AVANT toute lecture ──
        const finalText = event.text || synthesisTextRef.current;
        synthesisTextRef.current = finalText;
        setSynthesis(finalText);
        synthesisPhaseRef.current = "reading";

        const lectureTemplate =
          communRef.current?.synthese_lecture ||
          "Lis à voix haute, mot pour mot, le texte suivant :\n\n{{texte_synthese}}";
        sendEvent({
          type: "response.create",
          response: {
            output_modalities: ["audio"],
            instructions: lectureTemplate.replace("{{texte_synthese}}", finalText),
          },
        });
        break;
      }

      case "conversation.item.input_audio_transcription.delta": {
        const id = event.item_id || "user";
        transcriptRef.current[id] = (transcriptRef.current[id] || "") + (event.delta || "");
        upsertMessage(id, "user", transcriptRef.current[id]);
        break;
      }

      case "conversation.item.input_audio_transcription.completed": {
        const id = event.item_id || "user";
        transcriptRef.current[id] = event.transcript || transcriptRef.current[id] || "";
        upsertMessage(id, "user", transcriptRef.current[id]);
        break;
      }

      case "input_audio_buffer.speech_started":
        // ── BLOQUÉ si l'IA parle ou si synthèse en cours ──
        if (isAISpeakingRef.current || interviewClosedRef.current) {
          // Vider immédiatement le buffer pour annuler la détection
          sendEvent({ type: "input_audio_buffer.clear" });
          break;
        }
        setIsListening(true);
        audioQueueRef.current = []; isPlayingRef.current = false; setIsSpeaking(false);
        break;

      case "input_audio_buffer.speech_stopped":
        if (interviewClosedRef.current) break;
        setIsListening(false);
        break;

      case "response.done":
        // ── L'IA a terminé sa réponse → on libère le verrou ──
        // On attend que la queue audio soit vide avant de libérer
        // playNextChunk gère déjà isAISpeakingRef quand la queue est vide
        setIsSpeaking(false);
        break;

      case "error":
        console.error("OpenAI Realtime error:", event.error);
        setErrorMsg(event.error?.message || "Erreur API inconnue.");
        break;

      default: break;
    }
  }, [sendEvent, enqueueAudio, upsertMessage, disconnectSession]);

  const startInterview = async () => {
    setErrorMsg(null);
    try {
      setStatus("connecting");

      const sessionRes = await fetch(`/api/session?metier=${encodeURIComponent(metierSelectionne ?? "")}`, { credentials: "same-origin" });
      if (!sessionRes.ok) {
        const body = await sessionRes.json().catch(() => ({}));
        throw new Error(body.error || body.detail || `Erreur serveur ${sessionRes.status}`);
      }
      const sessionData  = await sessionRes.json();
      const ephemeralKey = sessionData.value;
      if (!ephemeralKey) throw new Error("Token éphémère absent. Vérifiez /api/session.");

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 24000 },
      });
      micStreamRef.current = micStream;
      audioCtxRef.current  = new AudioContext({ sampleRate: 24000 });

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      micStream.getTracks().forEach((t) => pc.addTrack(t, micStream));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onopen    = () => { console.log("✅ DataChannel ouvert"); setStatus("connected"); };
      dc.onmessage = (e) => handleServerEvent(e.data);
      dc.onerror   = () => setErrorMsg("Erreur de connexion DataChannel.");

      pc.ontrack = (e) => {
        const el = document.getElementById("jury-audio") as HTMLAudioElement | null;
        if (el && e.streams[0]) { el.srcObject = e.streams[0]; el.play().catch(() => {}); }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          disconnectSession();
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(`${WEBRTC_URL}?model=${MODEL}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${ephemeralKey}`, "Content-Type": "application/sdp" },
        body: offer.sdp,
      });
      if (!sdpRes.ok) throw new Error(`Erreur SDP ${sdpRes.status}: ${await sdpRes.text()}`);
      await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Impossible de se connecter.");
      setStatus("error");
      disconnectSession();
    }
  };

  const cleanup = () => {
    dcRef.current?.close(); pcRef.current?.close();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    audioQueueRef.current = []; isPlayingRef.current = false;
    isAISpeakingRef.current = false;
    pcRef.current = dcRef.current = micStreamRef.current = audioCtxRef.current = null;
    transcriptRef.current = {};
    const el = document.getElementById("jury-audio") as HTMLAudioElement | null;
    if (el) el.srcObject = null;
  };

  const stopInterview = () => {
    cleanup();
    setStatus("idle"); setIsSpeaking(false); setIsListening(false);
    setMessages([]); setMode(null); setQuestionNum(0);
    interviewClosedRef.current = false;
    synthesisPhaseRef.current  = "idle";
    synthesisTextRef.current   = "";
  };

  const downloadSynthesis = () => {
    if (!synthesis) return;
    const date = new Date().toLocaleDateString("fr-FR").replace(/\//g, "-");
    const content = [
      "SYNTHÈSE FINALE — JURY VAE AIDE-SOIGNANT",
      "Conçu par Patrice DIAKITÉ · SAVOIRSCOPE",
      `Date : ${new Date().toLocaleDateString("fr-FR")}`,
      "",
      "════════════════════════════════════════",
      "",
      synthesis,
      "",
      "════════════════════════════════════════",
      "Document généré automatiquement par le Jury IA VAE",
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `synthese-VAE-${date}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const interruptJury = () => {
    if (interviewClosedRef.current) return;
    audioQueueRef.current = []; isPlayingRef.current = false;
    isAISpeakingRef.current = false; // ── Libérer le verrou sur interruption manuelle
    setIsSpeaking(false);
    sendEvent({ type: "response.cancel" });
  };

  // ── L'accès est désormais géré par cookie de session (voir /api/auth/*) ──

  const modeLabel = mode === "apprentissage" ? "Mode Apprentissage" : mode === "simulation" ? "Mode Simulation" : null;
  const modeBadgeColor = mode === "apprentissage" ? "bg-blue-50 border-blue-200 text-blue-700" : mode === "simulation" ? "bg-amber-50 border-amber-200 text-amber-700" : "";
  const statusLabel = isConnecting ? "Connexion en cours…" : isConnected ? isSpeaking ? "Le jury s'exprime…" : isListening ? "À vous la parole" : mode ? "En attente de votre réponse" : "Choisissez votre mode" : referentiel ? `Prêt pour votre oral — ${referentiel.titre}` : "Choisissez votre métier";


  // ── Écran de chargement pendant la vérification de la session ──
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#f7f5f1] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#5f6452] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Écran de connexion par lien magique (si aucune session valide) ──
  if (!authEmail) {
    return (
      <div className="min-h-screen bg-[#f7f5f1] text-[#2b2e27] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="h-10 w-10 rounded-lg bg-[#5f6452] flex items-center justify-center shadow-sm">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l7 4v6c0 5-3.5 9.5-7 10-3.5-.5-7-5-7-10V6l7-4z" stroke="white" strokeWidth="1.6" fill="white" fillOpacity="0.2"/>
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="font-serif text-[19px] italic tracking-tight">
              Jury IA <span className="font-medium not-italic">VAE</span>
            </div>
          </div>

          {loginStatus === "envoye" ? (
            <div className="text-center rounded-xl border border-[#e0dbd0] bg-white px-6 py-8">
              <div className="text-[15px] font-semibold text-[#2b2e27] mb-2">Vérifiez votre boîte mail</div>
              <div className="text-[13px] text-[#7a7f6f]">
                Un lien de connexion vient d'être envoyé à<br /><span className="font-medium text-[#2b2e27]">{loginEmail}</span>.
                <br />Il est valable 15 minutes.
              </div>
              <button
                onClick={() => setLoginStatus("idle")}
                className="mt-5 text-[12px] font-semibold text-[#8a8f7d] hover:text-[#5f6452]"
              >
                Utiliser une autre adresse email
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-[#e0dbd0] bg-white px-6 py-8">
              <p className="text-[13px] text-[#7a7f6f] mb-4 text-center">
                Entrez l'adresse email associée à votre compte pour recevoir votre lien de connexion.
              </p>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && demanderLienConnexion()}
                placeholder="votre@email.com"
                className="w-full rounded-lg border border-[#e0dbd0] px-4 py-2.5 text-[14px] mb-3 focus:outline-none focus:border-[#5f6452]"
                autoFocus
              />
              {loginStatus === "erreur" && loginErrorMsg && (
                <div className="text-[12px] text-red-600 mb-3">{loginErrorMsg}</div>
              )}
              <button
                onClick={demanderLienConnexion}
                disabled={!loginEmail || loginStatus === "envoi"}
                className="w-full rounded-lg bg-[#5f6452] text-white text-[14px] font-semibold py-2.5 hover:bg-[#4d5142] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loginStatus === "envoi" ? "Envoi en cours…" : "Recevoir mon lien de connexion"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5f1] text-[#2b2e27] flex flex-col">
      <audio id="jury-audio" autoPlay hidden />

      <header className="border-b border-[#e5e1d8] bg-[#fafaf7]/95 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-[#5f6452] flex items-center justify-center shadow-sm flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l7 4v6c0 5-3.5 9.5-7 10-3.5-.5-7-5-7-10V6l7-4z" stroke="white" strokeWidth="1.6" fill="white" fillOpacity="0.2"/>
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-serif text-[17px] sm:text-[21px] leading-none italic tracking-tight text-[#2b2e27] truncate">
                Jury IA : <span className="font-medium not-italic">VAE {referentiel ? referentiel.titre : "Savoirscope"}</span>
              </div>
              <div className="text-[9px] tracking-widest text-[#7a7f6f] mt-0.5">
                ENTRAÎNEMENT OFFICIEL & SIMULATION · SAVOIRSCOPE
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {modeLabel && (
              <div className={`hidden sm:flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${modeBadgeColor}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${mode === "apprentissage" ? "bg-blue-500" : "bg-amber-500"}`}/>
                {modeLabel}
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#e0dbd0] bg-white/70 px-3 py-1.5 text-xs">
              <span className={`h-2 w-2 rounded-full transition-colors duration-500 ${isConnected ? "bg-emerald-500 animate-pulse" : isConnecting ? "bg-amber-400 animate-pulse" : "bg-[#b5b5a8]"}`}/>
              <span className="text-[#6b6f5f] uppercase tracking-wide font-medium text-[10px]">
                {isConnected ? "CONNECTÉ" : isConnecting ? "CONNEXION…" : "DÉCONNECTÉ"}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#e0dbd0] bg-white px-3 py-1.5 text-[10px] sm:text-[11px] font-medium text-[#4a4e42] shadow-sm whitespace-nowrap">
              {authEmail}
            </div>
            <button
              onClick={deconnecter}
              className="text-[11px] font-semibold text-[#8a8f7d] hover:text-[#5f6452] px-2"
              title="Se déconnecter"
            >
              Déconnexion
            </button>
          </div>
        </div>
        {isConnected && (
          <div className="h-[3px] w-full bg-[#ede9e0]">
            <div className={`h-full transition-all duration-1000 ${timeWarning ? "bg-amber-400" : "bg-[#5f6452]"}`} style={{ width: `${progressPct}%` }}/>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1280px] w-full px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-6 flex-1">
        <section className="bg-white rounded-[28px] border border-[#ebe6db] shadow-[0_10px_30px_rgba(0,0,0,0.04)] p-6 sm:p-8 md:p-10 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] text-[#8a8f7d]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 12h3l3-8 4 16 3-8h5"/></svg>
              ESPACE D'ENTRETIEN
            </div>
            {isConnected && (
              <div className={`font-mono text-[13px] font-semibold px-3 py-1 rounded-lg ${timeWarning ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-[#f3f2ee] text-[#5f6452]"}`}>
                {formatTime(seconds)} / 20:00
              </div>
            )}
          </div>

          <div className="flex flex-col items-center text-center flex-1">
            <div className="relative">
              <div className={`h-[124px] w-[124px] rounded-full flex items-center justify-center transition-all duration-500 ${
                isConnected ? isSpeaking ? "bg-[#6b735c] shadow-[0_0_0_16px_rgba(107,115,92,0.10),0_0_0_32px_rgba(107,115,92,0.04)]" : isListening ? "bg-[#748068] shadow-[0_0_0_10px_rgba(116,128,104,0.12)]" : "bg-[#5f6452] shadow-[0_4px_20px_rgba(95,100,82,0.20)]" : isConnecting ? "bg-[#8a8f7d]" : "bg-[#a8ad9d]"
              }`}>
                {isSpeaking && <div className="absolute inset-0 rounded-full animate-ping bg-[#6b735c]/12"/>}
                {isConnecting ? (
                  <svg className="animate-spin text-white" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                ) : isConnected && isListening ? (
                  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : isSpeaking ? (
                  <div className="flex items-end gap-[5px] h-9">
                    {[0.55, 1, 0.75, 1.15, 0.65].map((h, i) => (
                      <div key={i} className="w-[5px] bg-white rounded-full" style={{ height: `${h * 100}%`, animation: `soundwave 0.7s ease-in-out ${i * 0.11}s infinite alternate` }}/>
                    ))}
                  </div>
                ) : (
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7" className="opacity-75">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
            </div>

            {modeLabel && (
              <div className={`sm:hidden mt-5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${modeBadgeColor}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${mode === "apprentissage" ? "bg-blue-500" : "bg-amber-500"}`}/>{modeLabel}
              </div>
            )}

            <h1 className="mt-8 font-serif text-[26px] sm:text-[32px] md:text-[36px] leading-tight italic text-[#2f332a]">{statusLabel}</h1>

            <p className="mt-3 max-w-[500px] text-[14px] sm:text-[15px] leading-relaxed text-[#6f7566]">
              {isConnected ? mode ? "Parlez naturellement en français. Attendez que le jury ait terminé avant de répondre." : "Dites MODE APPRENTISSAGE ou MODE SIMULATION pour commencer." : referentiel ? "Cliquez sur le bouton ci-dessous pour démarrer la simulation. Assurez-vous d'être dans un environnement calme et d'avoir autorisé l'accès à votre microphone." : categorieSelectionnee ? "Sélectionnez votre métier pour commencer." : "Choisissez votre domaine, puis votre métier, pour commencer."}
            </p>

            {errorMsg && (
              <div className="mt-5 max-w-md w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700 text-left leading-relaxed">
                <span className="font-semibold block mb-1">⚠ Erreur de connexion</span>{errorMsg}
              </div>
            )}

            {!isConnected && !isConnecting && !referentiel && (
              <div className="mt-8 w-full max-w-sm">
                {!categorieSelectionnee ? (
                  <>
                    <p className="text-[13px] text-[#8a8f7d] mb-4 uppercase tracking-widest font-semibold">Choisissez un domaine</p>
                    <div className="space-y-2">
                      {CATEGORIES.map((cat) => {
                        const disponible = cat.metiers.length > 0;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => disponible && setCategorieSelectionnee(cat.id)}
                            disabled={!disponible}
                            className={`w-full flex items-center justify-between rounded-xl border px-5 py-3.5 text-left transition-all duration-150 group ${
                              disponible
                                ? "border-[#e0dbd0] bg-white hover:bg-[#f3f2ee] hover:border-[#5f6452] cursor-pointer"
                                : "border-[#ebe6db] bg-[#faf9f6] cursor-not-allowed opacity-60"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-[20px]">{cat.icon}</span>
                              <div>
                                <div className={`text-[14px] font-semibold ${disponible ? "text-[#2b2e27] group-hover:text-[#5f6452]" : "text-[#8a8f7d]"}`}>{cat.titre}</div>
                                <div className="text-[11px] text-[#9a9f8d] mt-0.5">{cat.description}</div>
                              </div>
                            </div>
                            {disponible ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a9f8d" strokeWidth="2" className="group-hover:stroke-[#5f6452] flex-shrink-0">
                                <path d="M9 18l6-6-6-6"/>
                              </svg>
                            ) : (
                              <span className="flex-shrink-0 text-[10px] font-semibold text-[#a89a6f] bg-[#f3ecd8] px-2 py-1 rounded-full whitespace-nowrap ml-2">Bientôt disponible</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setCategorieSelectionnee(null)}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-[#8a8f7d] hover:text-[#5f6452] mb-4"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6"/>
                      </svg>
                      Retour aux domaines
                    </button>
                    <p className="text-[13px] text-[#8a8f7d] mb-4 uppercase tracking-widest font-semibold">Sélectionnez votre métier</p>
                    <div className="space-y-2">
                      {METIERS
                        .filter((m) => CATEGORIES.find((c) => c.id === categorieSelectionnee)?.metiers.includes(m.id))
                        .map((m) => (
                          <button
                            key={m.id}
                            onClick={() => chargerReferentiel(m.id)}
                            disabled={loadingMetier}
                            className="w-full flex items-center justify-between rounded-xl border border-[#e0dbd0] bg-white px-5 py-3.5 text-left hover:bg-[#f3f2ee] hover:border-[#5f6452] transition-all duration-150 group"
                          >
                            <div>
                              <div className="text-[14px] font-semibold text-[#2b2e27] group-hover:text-[#5f6452]">{m.titre}</div>
                              <div className="text-[11px] text-[#9a9f8d] mt-0.5">{m.diplome}</div>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a9f8d" strokeWidth="2" className="group-hover:stroke-[#5f6452]">
                              <path d="M9 18l6-6-6-6"/>
                            </svg>
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {!isConnected && !isConnecting && referentiel && (
              <div className="mt-8 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 rounded-full border border-[#5f6452] bg-[#f3f2ee] px-4 py-2">
                  <span className="text-[12px] font-semibold text-[#5f6452]">{referentiel.titre}</span>
                  <span className="text-[11px] text-[#8a8f7d]">· {referentiel.diplome}</span>
                  <button onClick={() => { setReferentiel(null); setMetierSelectionne(null); }} className="ml-2 text-[#9a9f8d] hover:text-[#a44a3f] text-[14px]">✕</button>
                </div>
                <button onClick={startInterview} className="inline-flex items-center gap-2.5 rounded-xl bg-[#5f6452] px-7 py-3.5 text-[15px] font-medium text-white shadow-[0_8px_20px_rgba(95,100,82,0.25)] hover:bg-[#545a48] active:scale-[0.98] transition-all duration-150">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" strokeLinecap="round"/>
                  </svg>
                  Démarrer l'Entretien
                </button>
              </div>
            )}

            {isConnected && (
              <div className="mt-7 flex items-center gap-3 flex-wrap justify-center">
                <button onClick={interruptJury} className="rounded-xl border border-[#ddd8cc] bg-white px-5 py-2.5 text-[13px] font-medium text-[#4a4e42] hover:bg-[#f9f7f3] transition-all shadow-sm">Interrompre</button>
                <button onClick={stopInterview} className="rounded-xl bg-[#a44a3f] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#8f3f35] transition-all shadow-sm">Terminer l'entretien</button>
              </div>
            )}

            {isConnected && mode && questionNum > 0 && (
              <div className="mt-7 w-full max-w-xs">
                <div className="flex justify-between text-[11px] text-[#8a8f7d] mb-1.5">
                  <span>Questions</span>
                  <span className="font-medium text-[#5f6452]">{questionNum} / 10</span>
                </div>
                <div className="h-1.5 w-full bg-[#ede9e0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#5f6452] rounded-full transition-all duration-700" style={{ width: `${(questionNum / 10) * 100}%` }}/>
                </div>
              </div>
            )}
          </div>

          {isConnected && messages.length > 0 && (
            <div className="mt-10 border-t border-[#f0ebe1] pt-7">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-semibold tracking-[0.14em] text-[#6b6f5f] uppercase">Transcription en direct</h3>
                <span className="text-[11px] text-[#9a9f8d]">{messages.length} échange{messages.length > 1 ? "s" : ""}</span>
              </div>
              <div className="max-h-[280px] overflow-y-auto space-y-3.5 pr-1">
                {messages.slice(-12).map((m) => (
                  <div key={m.id} className="flex gap-3">
                    <div className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold ${m.role === "assistant" ? "bg-[#5f6452] text-white" : "bg-[#e8e4d9] text-[#5a5e50]"}`}>
                      {m.role === "assistant" ? "J" : "V"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-[#8a8f7d] mb-0.5">{m.role === "assistant" ? "Jury IA" : "Vous"}</div>
                      <div className="text-[13px] sm:text-[14px] leading-relaxed text-[#3a3e34] break-words">
                        {m.text.split("\n").map((line, i) =>
                          line.trim() === "" ? <br key={i}/> : <span key={i} className="block">{line}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef}/>
              </div>
            </div>
          )}

          {!isConnected && synthesis && (
            <div className="mt-8 border-t border-[#f0ebe1] pt-7">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-7 w-7 rounded-full bg-[#5f6452] flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                </div>
                <h3 className="text-[11px] font-semibold tracking-[0.14em] text-[#5f6452] uppercase">Synthèse finale de votre entretien</h3>
              </div>
              <div className="bg-[#f9f8f5] rounded-2xl border border-[#e8e4d9] p-5 sm:p-6">
                <div className="text-[13px] sm:text-[14px] leading-relaxed text-[#3a3e34] whitespace-pre-wrap">
                  {synthesis}
                </div>
              </div>
              <button
                onClick={downloadSynthesis}
                className="mt-5 w-full inline-flex items-center justify-center gap-2.5 rounded-xl border-2 border-[#5f6452] px-6 py-3.5 text-[13px] sm:text-[14px] font-semibold text-[#5f6452] hover:bg-[#5f6452] hover:text-white transition-all duration-200 shadow-sm"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Télécharger votre synthèse de Jury IA
              </button>
            </div>
          )}
        </section>

        <div className="space-y-5">
          <section className="bg-white rounded-[28px] border border-[#ebe6db] shadow-[0_10px_30px_rgba(0,0,0,0.04)] p-6 sm:p-7">
            <h3 className="text-[10px] tracking-[0.2em] text-[#8a8f7d] font-semibold mb-5 uppercase">Déroulement de l'entretien</h3>
            <div className="space-y-4">
              {[
                { n: 1, label: "Choix du mode",  desc: "Apprentissage ou Simulation." },
                { n: 2, label: "Présentation",    desc: "Identité et parcours professionnel." },
                { n: 3, label: "Synthèse finale", desc: "Verdict et conseils personnalisés." },
              ].map((step) => {
                const stepActive = step.n === 1 ? (isConnected && !mode) : step.n === 2 ? (isConnected && !!mode && questionNum === 0) : step.n === 3 ? (isConnected && !!mode && questionNum > 0 && questionNum < 10) : step.n === 4 ? (isConnected && questionNum >= 10) : false;
                const stepDone   = step.n === 1 ? (isConnected && !!mode) : step.n === 2 ? (isConnected && questionNum > 0) : step.n === 3 ? (isConnected && questionNum >= 10) : false;
                return (
                  <div key={step.n} className="flex items-start gap-3">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-semibold border-2 transition-all duration-500 flex-shrink-0 mt-0.5 ${stepDone ? "bg-[#5f6452] border-[#5f6452] text-white" : stepActive ? "bg-[#5f6452] border-[#5f6452] text-white ring-4 ring-[#5f6452]/15" : "bg-white border-[#ddd8cc] text-[#9a9f8d]"}`}>
                      {stepDone ? (<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>) : step.n}
                    </div>
                    <div>
                      <div className={`text-[14px] font-medium transition-colors ${stepActive || stepDone ? "text-[#2b2e27]" : "text-[#7a7f6f]"}`}>{step.label}</div>
                      <div className="text-[11px] text-[#9a9f8d] mt-0.5">{step.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {referentiel && (
          <section className="bg-white rounded-[24px] border border-[#ebe6db] shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-5 sm:p-6">
            <h3 className="text-[10px] tracking-[0.2em] text-[#8a8f7d] font-semibold mb-4 uppercase">Référentiel {referentiel.diplome} — {referentiel.domaines.length} domaines</h3>
            <div className="space-y-2">
              {referentiel.domaines.map((da) => (
                <div key={da.code} className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono font-bold text-[#5f6452] bg-[#f3f2ee] px-2 py-0.5 rounded flex-shrink-0">{da.code}</span>
                  <span className="text-[12px] text-[#5e6457]">{da.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[#f0ebe1]">
              <span className="text-[11px] text-[#9a9f8d]">{referentiel.competences_count} compétences évaluées</span>
            </div>
          </section>
          )}

          <section className="bg-white rounded-[24px] border border-[#ebe6db] shadow-[0_4px_16px_rgba(0,0,0,0.03)] p-5 sm:p-6">
            <h3 className="text-[10px] tracking-[0.2em] text-[#8a8f7d] font-semibold mb-4 uppercase">Les deux modes</h3>
            <div className="space-y-3">
              <div className={`rounded-xl border p-3 transition-all ${mode === "apprentissage" ? "border-blue-200 bg-blue-50" : "border-[#ebe6db] bg-[#fafaf7]"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2 w-2 rounded-full bg-blue-400 flex-shrink-0"/>
                  <span className="text-[12px] font-semibold text-[#2b2e27]">Mode Apprentissage</span>
                </div>
                <p className="text-[11px] text-[#6b6f5f] leading-snug pl-4">Aide après chaque réponse. Corrections au fil des questions. Idéal pour progresser.</p>
              </div>
              <div className={`rounded-xl border p-3 transition-all ${mode === "simulation" ? "border-amber-200 bg-amber-50" : "border-[#ebe6db] bg-[#fafaf7]"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0"/>
                  <span className="text-[12px] font-semibold text-[#2b2e27]">Mode Simulation</span>
                </div>
                <p className="text-[11px] text-[#6b6f5f] leading-snug pl-4">Jury impartial. Pas de correction en cours. Synthèse uniquement à la fin. Comme le vrai jury.</p>
              </div>
            </div>
          </section>

          <section className="rounded-[20px] border-l-4 border-[#b8bcae] bg-[#f9f8f5] px-5 py-4">
            <h4 className="text-[10px] tracking-[0.2em] text-[#6b6f5f] font-semibold mb-2 uppercase">Confidentialité</h4>
            <p className="text-[12px] leading-snug text-[#5a5e50] italic">Les échanges sont traités en temps réel par l'IA et ne sont pas stockés à l'issue de votre session.</p>
          </section>
        </div>
      </main>

      <div className="mx-auto max-w-[1280px] w-full px-4 sm:px-6 pb-10 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <section className="bg-white/70 backdrop-blur rounded-[22px] border border-[#ebe6db] p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b6f5f" strokeWidth="1.8">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>
            </svg>
            <h4 className="text-[11px] font-semibold tracking-wide text-[#5a5e50] uppercase">Sujets évalués</h4>
          </div>
          <ul className="space-y-1.5 text-[12px] text-[#5e6457]">
            {["Savoir-faire attendus","Prestations professionnelles","Gestes et postures","Missions types"].map((s) => (
              <li key={s} className="flex gap-2"><span className="text-[#b0b5a5] flex-shrink-0">•</span>{s}</li>
            ))}
          </ul>
        </section>
        <section className="bg-white/70 backdrop-blur rounded-[22px] border border-[#ebe6db] p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b6f5f" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
            </svg>
            <h4 className="text-[11px] font-semibold tracking-wide text-[#5a5e50] uppercase">Conseils de préparation</h4>
          </div>
          <ul className="space-y-1.5 text-[12px] text-[#5e6457]">
            {["Préparez des exemples concrets et datés","Maîtrisez le vocabulaire technique","Décrivez vos gestes étape par étape","Citez votre structure d'exercice précisément","Ne vous pressez pas — le jury attend"].map((s) => (
              <li key={s} className="flex gap-2"><span className="text-[#b0b5a5] flex-shrink-0">•</span>{s}</li>
            ))}
          </ul>
        </section>
      </div>

      {isConnected && showInactivity && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 sm:pb-6 pointer-events-none">
          <div className="mx-auto max-w-[760px] pointer-events-auto">
            <div className="relative overflow-hidden rounded-2xl border border-amber-300 bg-amber-50 shadow-[0_-8px_30px_rgba(180,120,40,0.18)] backdrop-blur">
              <div className="absolute top-0 left-0 h-[3px] bg-amber-400 transition-all duration-1000 ease-linear" style={{ width: `${(countdown / COUNTDOWN_DURATION) * 100}%` }}/>
              <div className="flex items-center gap-4 p-4 sm:p-5">
                <div className="flex-shrink-0 h-11 w-11 rounded-full bg-amber-100 flex items-center justify-center animate-pulse">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] sm:text-[15px] font-semibold text-amber-900 leading-tight">Inactivité détectée</div>
                  <div className="text-[12px] sm:text-[13px] text-amber-800 mt-0.5">
                    Déconnexion automatique dans{" "}
                    <span className="font-mono font-bold text-amber-900 tabular-nums">{countdown}s</span>
                    {" "}si aucune activité.
                  </div>
                </div>
                <button onClick={continueSession} className="flex-shrink-0 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-semibold px-4 sm:px-5 py-2.5 shadow-sm transition-all active:scale-95">Continuer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes soundwave {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
