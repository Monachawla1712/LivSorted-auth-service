import { UserRole } from '../../user/enum/user.role';

export type JwtPayload = {
  iss: string;
  exp?: number;
  userId: string;
  roles: typeof UserRole[];
};
