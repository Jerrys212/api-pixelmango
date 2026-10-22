import type { User } from '../domain/user.entity.js';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  isEmailConfirmed: boolean;
  createdAt: Date;
}

export function toUserAccount(user: User): UserAccount {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isEmailConfirmed: user.isEmailConfirmed,
    createdAt: user.createdAt,
  };
}
