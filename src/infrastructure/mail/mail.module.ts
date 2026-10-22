import { Global, Module } from '@nestjs/common';
import { MAIL_SENDER } from './mail-sender.js';
import { SmtpMailSender } from './smtp-mail.sender.js';

@Global()
@Module({
  providers: [{ provide: MAIL_SENDER, useClass: SmtpMailSender }],
  exports: [MAIL_SENDER],
})
export class MailModule {}
