let sgMail
try {
  sgMail = require('@sendgrid/mail')
} catch {
  sgMail = null
}

module.exports = {
  async send(item) {
    if (!sgMail) {
      console.warn('@sendgrid/mail not installed, skipping email')
      return false
    }
    if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'your-sendgrid-api-key') {
      console.warn('SENDGRID_API_KEY not configured, skipping email')
      return false
    }
    if (!item.companies?.email) {
      console.warn(`No email for company ${item.companies?.name}`)
      return false
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    await sgMail.send({
      to: item.companies.email,
      from: process.env.SENDGRID_FROM_EMAIL ?? 'sora@jva.example.com',
      subject: `JVA Internship Board — ${item.companies.name}`,
      text: item.message,
    })
    return true
  }
}
