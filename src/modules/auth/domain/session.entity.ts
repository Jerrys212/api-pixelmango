export interface SessionProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
}

export class Session {
  private constructor(private readonly props: SessionProps) {}

  static open(input: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Session {
    return new Session({
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      createdAt: input.now,
      revokedAt: null,
      replacedById: null,
    });
  }

  static restore(props: SessionProps): Session {
    return new Session({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  get replacedById(): string | null {
    return this.props.replacedById;
  }

  get isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  isActive(now: Date): boolean {
    return !this.isRevoked && this.props.expiresAt > now;
  }
}
