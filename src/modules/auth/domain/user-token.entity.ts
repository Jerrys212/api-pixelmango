export const USER_TOKEN_TYPES = [
  'email_confirmation',
  'password_reset',
] as const;

export type UserTokenType = (typeof USER_TOKEN_TYPES)[number];

export interface UserTokenProps {
  id: string;
  userId: string;
  type: UserTokenType;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export class UserToken {
  private constructor(private readonly props: UserTokenProps) {}

  static issue(input: {
    userId: string;
    type: UserTokenType;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): UserToken {
    return new UserToken({
      id: globalThis.crypto.randomUUID(),
      userId: input.userId,
      type: input.type,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      consumedAt: null,
      createdAt: input.now,
    });
  }

  static restore(props: UserTokenProps): UserToken {
    return new UserToken({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get type(): UserTokenType {
    return this.props.type;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get consumedAt(): Date | null {
    return this.props.consumedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isUsable(now: Date): boolean {
    return this.props.consumedAt === null && this.props.expiresAt > now;
  }
}
