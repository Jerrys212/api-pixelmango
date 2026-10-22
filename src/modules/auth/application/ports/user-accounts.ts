export const USER_ACCOUNTS = Symbol('USER_ACCOUNTS');

export interface AccountSummary {
  id: string;
  email: string;
  name: string;
  isEmailConfirmed: boolean;
}

export interface UserAccounts {
  register(input: {
    email: string;
    name: string;
    password: string;
  }): Promise<AccountSummary>;
  findByEmail(email: string): Promise<AccountSummary | null>;
  verifyCredentials(
    email: string,
    password: string,
  ): Promise<AccountSummary | null>;
  confirmEmail(userId: string): Promise<void>;
  changePassword(userId: string, newPassword: string): Promise<void>;
}
