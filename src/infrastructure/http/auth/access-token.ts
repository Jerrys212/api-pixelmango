export interface AccessTokenPayload {
  sub: string;
  typ: 'access';
}

export interface AuthenticatedUser {
  id: string;
}

export interface AuthenticatedRequest {
  user?: AuthenticatedUser;
}
