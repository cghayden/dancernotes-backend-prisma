const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.POSTMARK_SERVER,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.POSTMARK_USER,
    pass: process.env.POSTMARK_PASS,
  },
});

exports.transporter = transporter;
