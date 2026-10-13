// Vercel/Node.js API route for Firestore-based login and first-login password reset
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let serviceAccountCache = null;

function getServiceAccount() {
  if (serviceAccountCache) return serviceAccountCache;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccountCache = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : process.env.FIREBASE_SERVICE_ACCOUNT;
      return serviceAccountCache;
    } catch (e) {
      console.warn('Could not parse FIREBASE_SERVICE_ACCOUNT env:', e.message);
    }
  }
  try {
    const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(keyPath)) {
      serviceAccountCache = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      return serviceAccountCache;
    }
  } catch (e) {
    console.warn('Could not load serviceAccountKey.json from disk:', e.message);
  }
  return null;
}

function getDb() {
  const sa = getServiceAccount();
  if (!sa) {
    throw new Error('Firebase Service Account configuration is missing');
  }
  if (!global._firebaseApp) {
    if (getApps().length > 0) {
      global._firebaseApp = getApps()[0];
    } else {
      global._firebaseApp = initializeApp({
        credential: cert(sa),
        projectId: sa.project_id || 'divine-36910',
      });
    }
  }
  return getFirestore();
}

const SMTP_USER = process.env.SMTP_USER || 'rajtilakjoshij@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'dodj zcdv tzfd fqsn';

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

function verifyPassword(inputPassword, storedPassword) {
  if (!storedPassword || !inputPassword) return false;
  // Match plaintext directly
  if (String(storedPassword) === String(inputPassword)) return true;
  // Match sha256 hash if applicable
  const hash = crypto.createHash('sha256').update(String(inputPassword)).digest('hex');
  if (String(storedPassword).toLowerCase() === hash.toLowerCase()) return true;
  return false;
}

module.exports = async function handler(req, res) {
  // Set CORS headers so browser requests are never blocked
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, newPassword, forgot } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const cleanEmail = email.trim().toLowerCase();

  try {
    const db = getDb();

    // Find user by email in Firestore
    const userSnap = await db.collection('users').where('email', '==', cleanEmail).get();

    // Emergency organizer bypass in case of network or unseeded account
    if (userSnap.empty && (cleanEmail === 'rajtilakjoshij@gmail.com' || cleanEmail === 'admin@divineenergyhub.org')) {
      if (password === 'divine2026' || password === 'admin2026') {
        return res.status(200).json({ success: true, role: 'admin', bypass: true });
      }
    }

    if (userSnap.empty) {
      return res.status(400).json({ error: `User with email "${cleanEmail}" not found in system` });
    }

    const userDoc = userSnap.docs[0];
    const user = userDoc.data();

    // Forgot password flow — generate temporary password & email it
    if (forgot) {
      const tempPassword = `divine@${Math.floor(100 + Math.random() * 900)}`;
      await userDoc.ref.update({ password: tempPassword, firstLogin: true });

      let emailSent = false;
      try {
        const transporter = getTransporter();
        await transporter.sendMail({
          from: SMTP_USER,
          to: cleanEmail,
          subject: 'Divine Energy Hub — Password Reset',
          html: `<h2>Password Reset</h2>
            <p>Hello ${user.name || 'Volunteer'},</p>
            <p>Your temporary login password is: <b>${tempPassword}</b></p>
            <p>You will be prompted to set your new permanent password upon your next login.</p>`,
        });
        emailSent = true;
      } catch (mailErr) {
        console.warn('SMTP delivery failed:', mailErr.message);
      }

      if (emailSent) {
        return res.status(200).json({
          success: true,
          message: `Temporary password sent to ${cleanEmail}. Please check your inbox.`,
        });
      } else {
        return res.status(200).json({
          success: true,
          message: `Email delivery unavailable. Temporary password: ${tempPassword}`,
          tempPassword,
        });
      }
    }

    // Password verification
    const passwordValid = verifyPassword(password, user.password);

    if (!passwordValid) {
      return res.status(400).json({ error: 'Invalid password. Please check and try again.' });
    }

    // First login: require user to set a new password
    if (user.firstLogin) {
      if (!newPassword) {
        return res.status(200).json({ firstLogin: true });
      }
      const updateData = { password: String(newPassword), firstLogin: false };
      if (user.role === 'admin') {
        updateData.authorized = true;
      }
      await userDoc.ref.update(updateData);
      return res.status(200).json({ success: true, reset: true });
    }

    // Normal login success
    return res.status(200).json({
      success: true,
      role: user.role || 'volunteer',
      name: user.name || '',
      email: cleanEmail,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Internal login error' });
  }
};
