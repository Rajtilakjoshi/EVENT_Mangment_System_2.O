// Vercel/Node.js API route for registration with Firestore and email notification
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

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
const DEV_EMAILS = (process.env.DEV_EMAIL || '').split(',').map(e => e.trim()).filter(Boolean);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const BCRYPT_ROUNDS = 12;

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
  const { email, name, phone, whatsappMobile } = req.body;
  if (!email || !name || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // Public self-register is always volunteer (admins are provisioned offline)
  const role = 'volunteer';
  const randomNum = Math.floor(100 + Math.random() * 900);
  const tempPassword = `divine@${randomNum}`;
  try {
    const userSnap = await db.collection('users').where('email', '==', email).get();
    if (!userSnap.empty) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    // Hash the temporary password before storing
    const hashedPassword = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
    await db.collection('users').add({
      email,
      password: hashedPassword,
      role,
      name,
      phone,
      whatsappMobile: whatsappMobile || phone,
      firstLogin: true,
      authorized: false,
    });

    // Send temporary password to the user (they must change it on first login)
    await transporter.sendMail({
      from: SMTP_USER,
      to: email,
      subject: 'Divine Event — Registration Successful',
      html: `<h2 style="color:#7c3aed">Welcome!</h2>
        <p>Your temporary password is: <b>${tempPassword}</b></p>
        <p>You will be asked to set a new password on your first login.</p>`
    });

    // Notify admins (without the password)
    const subject = `New ${role} registration`;
    const html = `<h2 style="color:#7c3aed">New ${role} registration</h2>
      <b>Name:</b> ${name}<br/>
      <b>Phone:</b> ${phone}<br/>
      <b>Email:</b> ${email}<br/>
      <b>Role:</b> ${role}<br/>`;

    const adminsSnap = await db.collection('users')
      .where('role', '==', 'admin')
      .where('authorized', '==', true)
      .get();
    const adminEmails = adminsSnap.docs.map(doc => doc.data().email).filter(Boolean);
    if (adminEmails.length === 0 && ADMIN_EMAIL) {
      adminEmails.push(ADMIN_EMAIL);
    }
    await Promise.all(
      [...adminEmails, ...DEV_EMAILS].filter(Boolean).map(to =>
        transporter.sendMail({ from: SMTP_USER, to, subject, html })
      )
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
