const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.POSTMARK_SERVER,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.POSTMARK_USER,
    pass: process.env.POSTMARK_PASS
  }
});

const makeANiceEmail = text => `
  <div className="email" style="
    border: 1px solid black;
    padding: 20px;
    font-family: sans-serif;
    line-height: 2;
    font-size: 20px;
  ">
    <h2>Hello There!</h2>
    <p>${text}</p>

    <p>😘, Dancer Notes</p>
  </div>
`;

exports.transporter = transporter;
exports.makeANiceEmail = makeANiceEmail;
