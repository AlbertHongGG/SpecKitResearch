export type SendPasswordResetEmailInput = {
  toEmail: string
  resetToken: string
}

export interface EmailSender {
  sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void>
}

export const EMAIL_SENDER = 'EMAIL_SENDER'

export class DevEmailSender implements EmailSender {
  async sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void> {
    // In dev, we do not send email. We log the token so the flow can be tested locally.

    console.log('[password-reset] to=%s token=%s', input.toEmail, input.resetToken)
  }
}
