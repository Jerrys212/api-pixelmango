export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface AuthMailInput {
  to: string;
  name: string;
  token: string;
}

export interface MailService {
  sendAccountConfirmation(input: AuthMailInput): Promise<void>;
  sendPasswordReset(input: AuthMailInput): Promise<void>;
}
