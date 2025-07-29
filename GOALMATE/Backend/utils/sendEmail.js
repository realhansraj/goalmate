import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'sandbox.smtp.mailtrap.io',
  port: 2525,
  auth: {
    user: '5d736e40af55d5', // Your Mailtrap username
    pass: 'da1cc760c379d9', // Your Mailtrap password
  },
});

const sendEmail = async ({ to, subject, text, html }) => {
  await transporter.sendMail({
    from: 'Your App <noreply@example.com>',
    to,
    subject,
    text,
    html,
  });
};

export default sendEmail; 