export type GlobalRole = "user" | "admin";

export type Actor =
  | { authenticated: false }
  | {
      authenticated: true;
      user: {
        id: string;
        role: GlobalRole;
      };
      moderatorBoards: string[];
    };

export function isAdmin(actor: Actor) {
  return actor.authenticated && actor.user.role === "admin";
}

export function isModeratorForBoard(actor: Actor, boardId: string) {
  return actor.authenticated && actor.moderatorBoards.includes(boardId);
}
