import type { MailMessage, Mailer } from './mailer.js';

export class ConsoleMailer implements Mailer {
  async send(msg: MailMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('[MAIL]', JSON.stringify(msg));
  }
}
