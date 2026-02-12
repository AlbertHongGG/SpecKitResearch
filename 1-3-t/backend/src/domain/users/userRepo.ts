export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserInput = {
  email: string;
  passwordHash: string;
};

export interface UserRepo {
  create(input: CreateUserInput): Promise<UserRecord>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
}
