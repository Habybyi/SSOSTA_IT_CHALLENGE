import nodemailer from "nodemailer";
import { config } from "../../config.js";

// Odosielanie cez SMTP. Lokálne Mailpit, v produkcii ľubovoľný SMTP (napr. Websupport, SendGrid).
const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  ...(config.smtp.user ? { auth: { user: config.smtp.user, pass: config.smtp.pass } } : {}),
});

export const sendEmail = ({ to, subject, text, html }) =>
  transporter.sendMail({ from: config.mailFrom, to, subject, text, html });
