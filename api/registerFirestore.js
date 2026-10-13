// Vercel/Node.js API route for registration with Firestore and email notification
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

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
    global._firebaseApp = initializeApp({
      credential: cert(sa),
      projectId: sa.project_id || 'divine-36910',
    });
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

const BCRYPT_ROUNDS = 12;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, phone, whatsappMobile } = req.body || {};
  if (!email || !name || !phone) {
    return res.status(400).json({ error: 'Missing required fields (email, name, phone)' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const role = 'volunteer';
  const randomNum = Math.floor(100 + Math.random() * 900);
  const tempPassword = `divine@${randomNum}`;

  try {
    const db = getDb();
    const userSnap = await db.collection('users').where('email', '==', cleanEmail).get();
    if (!userSnap.empty) {
      return res.status(400).json({ error: 'Email already registered in system' });
    }

    const hashedPassword = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
    await db.collection('users').add({
      email: cleanEmail,
      password: hashedPassword,
      role,
      name: name.trim(),
      phone: phone.trim(),
      whatsappMobile: (whatsappMobile || phone).trim(),
      firstLogin: true,
      createdAt: new Date().toISOString(),
    });

    let emailSent = false;
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: SMTP_USER,
        to: cleanEmail,
        subject: 'Divine Energy Hub — Volunteer Account Created',
        html: `<h2>Welcome to Divine Energy Hub</h2>
          <p>Hello <b>${name}</b>,</p>
          <p>Your volunteer access has been created.</p>
          <p>Your temporary login password is: <b>${tempPassword}</b></p>
          <p>You will be prompted to set your personal password upon first login.</p>`,
      });
      emailSent = true;
    } catch (mailErr) {
      console.warn('SMTP delivery failed on registration:', mailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: emailSent
        ? 'Account created! Temporary password sent to email.'
        : `Account created! Temporary password: ${tempPassword}`,
      tempPassword: emailSent ? undefined : tempPassword,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: err.message || 'Internal registration error' });
  }
}
