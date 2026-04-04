import type { AppRole } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  email: string;
  appRole: AppRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
