export type Role = 'buyer' | 'seller' | 'admin';

export type AuthUser = {
  id: string;
  email: string;
  roles: Role[];
};
