const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
  host: process.env.POSTMARK_SERVER,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.POSTMARK_USER,
    pass: process.env.POSTMARK_PASS,
  },
})

const makeANiceEmail = (link) => `
  <div className="email" style="
    border: 1px solid black;
    padding: 20px;
    font-family: sans-serif;
    line-height: 2;
    font-size: 20px;
  ">
    <h2>Hello!</h2>
    <p>
      A request was made to dancernotes.com to reset the password for the account associated with this email address.
    </p>
    <div>${link}</div>
    <p>This link will expire in one hour</p>
    <p>If you believe this email was sent in error, or you did not make this request, you can ignore this email, or request assistance by sending a message to admin@coreyhayden.tech </p>
    <p>Thank You,</p>
    <p>Dancer Notes</p>
  </div>
`

exports.transporter = transporter
exports.makeANiceEmail = makeANiceEmail
