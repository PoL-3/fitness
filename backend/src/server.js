require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const { pool } = require("./db");
const { generatePlanWithDeepSeek } = require("./deepseek");
const { savePlanToDb } = require("./planRepository");
const { register, login, getProfile, updateProfile } = require("./authService");
const journalRoutes = require("./journalRoutes");
const { authMiddleware } = require("./authMiddleware");
const forge = require("node-forge");
const ssh = require("./ssh");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

app.use(cors());
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: "База данных недоступна",
      detail: err.message,
    });
  }
});

/**
 * Utility endpoint: generates an RSA keypair on backend and returns:
 * - OpenSSH public key
 * - PEM private key (encrypted if passphrase is provided)
 * - md5 fingerprint (hex with :)
 *
 * This is meant as an integration example / internal tool.
 */
app.post("/utils/ssh-keygen", async (req, res) => {
  try {
    const bits = Number(req.body?.bits) || 2048;
    const comment = String(req.body?.comment || "").slice(0, 160);
    const passphrase = req.body?.passphrase ? String(req.body.passphrase) : "";
    const includePutty = Boolean(req.body?.includePutty);

    if (bits !== 2048 && bits !== 3072 && bits !== 4096) {
      return res
        .status(400)
        .json({ ok: false, error: "bits должен быть 2048/3072/4096" });
    }

    const keypair = await new Promise((resolve, reject) => {
      forge.pki.rsa.generateKeyPair({ bits, workers: 2 }, (err, kp) => {
        if (err) return reject(err);
        resolve(kp);
      });
    });

    const publicOpenSsh = ssh.publicKeyToOpenSSH(keypair.publicKey, comment);
    const privateOpenSsh = ssh.privateKeyToOpenSSH(keypair.privateKey, passphrase);
    const fp = ssh.getPublicKeyFingerprint(keypair.publicKey, {
      encoding: "hex",
      delimiter: ":",
    });

    const out = {
      ok: true,
      bits,
      fingerprintMd5: fp,
      publicKeyOpenSsh: publicOpenSsh,
      privateKeyOpenSsh: privateOpenSsh,
    };

    if (includePutty) {
      out.privateKeyPuttyPpk = ssh.privateKeyToPutty(
        keypair.privateKey,
        passphrase,
        comment,
      );
    }

    return res.json(out);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

const GOALS = ["weight_loss", "muscle_gain"];
const LEVELS = ["beginner", "intermediate", "advanced"];

function validateBody(body) {
  const errors = [];
  const { goal, level, weightKg, heightCm } = body || {};

  if (!GOALS.includes(goal)) {
    errors.push(`goal должен быть одним из: ${GOALS.join(", ")}`);
  }
  if (!LEVELS.includes(level)) {
    errors.push(`level должен быть одним из: ${LEVELS.join(", ")}`);
  }

  const w = Number(weightKg);
  const h = Number(heightCm);
  if (!Number.isFinite(w) || w <= 0 || w > 400) {
    errors.push("weightKg — положительное число (кг), разумный диапазон");
  }
  if (!Number.isFinite(h) || h <= 0 || h > 300) {
    errors.push("heightCm — положительное число (см), разумный диапазон");
  }

  return { errors, weightKg: w, heightCm: h };
}

// Plans are always tied to an authenticated account (req.userId).

app.post("/auth/register", async (req, res) => {
  try {
    const user = await register(req.body);
    const { token, user: u } = await login({
      email: user.email,
      password: req.body.password,
    });
    res.status(201).json({ ok: true, token, user: u });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ ok: false, error: err.message });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const result = await login(req.body);
    res.json({ ok: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ ok: false, error: err.message });
  }
});

app.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const row = await getProfile(req.userId);
    if (!row) {
      return res
        .status(404)
        .json({ ok: false, error: "Пользователь не найден" });
    }
    res.json({
      ok: true,
      user: {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        age: row.age,
        heightCm: row.height_cm != null ? Number(row.height_cm) : null,
        weightKg: row.weight_kg != null ? Number(row.weight_kg) : null,
        gender: row.gender != null ? String(row.gender) : null,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.put("/auth/profile", authMiddleware, async (req, res) => {
  try {
    const row = await updateProfile(req.userId, req.body);
    res.json({
      ok: true,
      user: {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        age: row.age,
        heightCm: row.height_cm != null ? Number(row.height_cm) : null,
        weightKg: row.weight_kg != null ? Number(row.weight_kg) : null,
        gender: row.gender != null ? String(row.gender) : null,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use("/journal", journalRoutes);

app.post("/generate-plan", authMiddleware, async (req, res) => {
  const { errors, weightKg, heightCm } = validateBody(req.body);
  if (errors.length) {
    return res.status(400).json({ ok: false, errors });
  }

  const { goal, level } = req.body;
  const userId = req.userId;

  let parsed;
  try {
    parsed = await generatePlanWithDeepSeek({
      goal,
      level,
      weightKg,
      heightCm,
    });
  } catch (err) {
    console.error("DeepSeek:", err.message);
    const status = err.status || 502;
    return res.status(status).json({
      ok: false,
      error: err.message,
      detail: err.detail,
    });
  }

  let planId;
  try {
    planId = await savePlanToDb({
      userId,
      goal,
      level,
      weightKg,
      heightCm,
      parsed,
    });
  } catch (err) {
    console.error("PostgreSQL:", err.message);
    return res.status(500).json({
      ok: false,
      error: "Не удалось сохранить план в базу",
      detail: err.message,
    });
  }

  return res.json({
    ok: true,
    planId,
    plan: parsed,
  });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

app.listen(PORT, HOST, () => {
  console.log(`API listening on http://${HOST}:${PORT}`);
  console.log("POST /auth/register | /auth/login | GET/PUT /auth/me|profile");
  console.log("GET|POST /journal/workouts | /journal/meals (Bearer)");
  console.log("POST /generate-plan");
});
