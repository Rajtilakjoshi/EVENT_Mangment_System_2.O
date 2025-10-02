const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Set these emails as allowed admins
const ALLOWED_ADMINS = [
    "rajttilakjoshij@gmail.com",
    "krishna.d.upadhyay@gmail.com",
];

// Use Firebase Functions config for secrets
const gmailEmail = functions.config().gmail.email;
const gmailPass = functions.config().gmail.password;

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: gmailEmail,
        pass: gmailPass,
    },
});

// Trigger on new user registration in Firestore
exports.notifyAdminOnVolunteerRegister = functions.firestore
    .document("users/{userId}")
    .onCreate(async (snap, context) => {
        const user = snap.data();
        if (user.role !== "volunteer" && user.role !== "admin") {
            return null;
        }
        // Only send for volunteers and admins
        const subject =
            user.role === "volunteer"
                ? "New Volunteer Registration"
                : "New Admin Registration";
        const html = [
            `<h3>${subject}</h3>`,
            `<p><b>Name:</b> ${user.firstName} ${user.lastName}</p>`,
            `<p><b>Email:</b> ${user.email}</p>`,
            `<p><b>Role:</b> ${user.role}</p>`,
            `<p><b>Photo:</b> <a href="${user.photoURL}">View Photo</a></p>`,
            `<p><b>Approve this user in Firestore to activate their account.</b></p>`,
        ].join("\n");
        // Only send admin registration to allowed emails
        const recipients = ALLOWED_ADMINS;
        await transporter.sendMail({
            from: `Event App <${gmailEmail}>`,
            to: recipients.join(","),
            subject,
            html,
        });
        return null;
    });
