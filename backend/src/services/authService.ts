import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AppRole } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';

const BCRYPT_ROUNDS = 12;

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

export type AuthUserDto = {
  id: string;
  email: string;
  name: string;
  appRole: AppRole;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserDto;
};

type AccessJwtPayload = {
  sub: string;
  email: string;
  appRole: AppRole;
};

type RefreshJwtPayload = {
  sub: string;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

function signAccessToken(payload: AccessJwtPayload): string {
  const opts: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as NonNullable<SignOptions['expiresIn']>,
  };
  return jwt.sign(payload, env.JWT_SECRET, opts);
}

function signRefreshToken(payload: RefreshJwtPayload): string {
  const opts: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as NonNullable<SignOptions['expiresIn']>,
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, opts);
}

function toUserDto(account: {
  id: string;
  email: string;
  name: string;
  appRole: AppRole;
}): AuthUserDto {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    appRole: account.appRole,
  };
}

export async function login(email: string, password: string): Promise<TokenPair> {
  const normalized = email.trim().toLowerCase();
  const account = await prisma.authAccount.findUnique({ where: { email: normalized } });

  if (!account) {
    throw new InvalidCredentialsError();
  }

  const match = await bcrypt.compare(password, account.passwordHash);
  if (!match) {
    throw new InvalidCredentialsError();
  }

  const accessPayload: AccessJwtPayload = {
    sub: account.id,
    email: account.email,
    appRole: account.appRole,
  };
  const accessToken = signAccessToken(accessPayload);
  const refreshToken = signRefreshToken({ sub: account.id });

  await prisma.authAccount.update({
    where: { id: account.id },
    data: {
      refreshToken,
      lastLogin: new Date(),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: toUserDto(account),
  };
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  let decoded: RefreshJwtPayload;
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshJwtPayload;
  } catch {
    throw new InvalidCredentialsError();
  }

  if (!decoded.sub) {
    throw new InvalidCredentialsError();
  }

  const account = await prisma.authAccount.findUnique({ where: { id: decoded.sub } });
  if (!account || !account.refreshToken || account.refreshToken !== refreshToken) {
    throw new InvalidCredentialsError();
  }

  const accessPayload: AccessJwtPayload = {
    sub: account.id,
    email: account.email,
    appRole: account.appRole,
  };
  const newAccess = signAccessToken(accessPayload);
  const newRefresh = signRefreshToken({ sub: account.id });

  await prisma.authAccount.update({
    where: { id: account.id },
    data: { refreshToken: newRefresh },
  });

  return {
    accessToken: newAccess,
    refreshToken: newRefresh,
    user: toUserDto(account),
  };
}

export async function logout(userId: string): Promise<void> {
  await prisma.authAccount.updateMany({
    where: { id: userId },
    data: { refreshToken: null },
  });
}
