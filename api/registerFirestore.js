// Vercel/Node.js API route for registration with Firestore and email notification
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
import nodemailer from 'nodemailer';

// Initialize Firebase Admin SDK
if (!global._firebaseApp) {
  global._firebaseApp = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}
const db = getFirestore();


// Email config
const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // for volunteer notifications (all admins)
const DEV_EMAILS = [
  'rajtilakjoshij@gmail.com',
  'Krishna.d.upadhyay@gmail.com',
];
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { email, role, name, phone } = req.body;
  if (!email || !role || !name || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // Generate random password in format divine@123, divine@124, etc.
  const randomNum = Math.floor(100 + Math.random() * 900); // 100-999
  const password = `divine@${randomNum}`;
  try {
    // Check if user exists
    const userSnap = await db.collection('users').where('email', '==', email).get();
    if (!userSnap.empty) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    // Add user to Firestore
    await db.collection('users').add({
      email,
      password,
      role,
      name,
      phone,
      firstLogin: true,
    });
    // Prepare email
    let subject = `New ${role} registration`;
    const html = `<h2 style="color:#7c3aed">New ${role} registration</h2>
      <b>Name:</b> ${name}<br/>
      <b>Phone:</b> ${phone}<br/>
      <b>Email:</b> ${email}<br/>
      <b>Password:</b> ${password}<br/>
      <b>Role:</b> ${role}<br/>`;

    if (role === 'admin') {
      // Send to all developers for new admin registration
      await Promise.all(
        DEV_EMAILS.map(devEmail =>
          transporter.sendMail({ from: SMTP_USER, to: devEmail, subject, html })
        )
      );
    } else {
      // Fetch all current admin emails from Firestore
      // Only send to admins who are authorized (authorized: true)
      const adminsSnap = await db.collection('users')
        .where('role', '==', 'admin')
        .where('authorized', '==', true)
        .get();
      const adminEmails = adminsSnap.docs.map(doc => doc.data().email).filter(Boolean);
      if (adminEmails.length === 0) {
        // fallback to static ADMIN_EMAIL if no authorized admins found
        adminEmails.push(ADMIN_EMAIL);
      }
      // Send to all authorized admins for new volunteer registration
      await Promise.all(
        adminEmails.map(adminEmail =>
          transporter.sendMail({ from: SMTP_USER, to: adminEmail, subject, html })
        )
      );
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
