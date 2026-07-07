import type { AuthedUser } from "./lib/authz.js";

export type Variables = {
  user: AuthedUser;
};
