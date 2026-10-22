import { normalizeEmail } from './email.js';

export interface UserProps {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  emailConfirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private props: UserProps) {}

  static register(input: {
    email: string;
    name: string;
    passwordHash: string;
    now: Date;
  }): User {
    return new User({
      id: globalThis.crypto.randomUUID(),
      email: normalizeEmail(input.email),
      name: input.name.trim(),
      passwordHash: input.passwordHash,
      emailConfirmedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static restore(props: UserProps): User {
    return new User({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get emailConfirmedAt(): Date | null {
    return this.props.emailConfirmedAt;
  }

  get isEmailConfirmed(): boolean {
    return this.props.emailConfirmedAt !== null;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  confirmEmail(now: Date): void {
    if (this.isEmailConfirmed) {
      return;
    }
    this.props = { ...this.props, emailConfirmedAt: now, updatedAt: now };
  }

  changePassword(passwordHash: string, now: Date): void {
    this.props = { ...this.props, passwordHash, updatedAt: now };
  }
}
