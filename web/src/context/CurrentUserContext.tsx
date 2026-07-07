import { createContext, useContext, useState, type ReactNode } from "react";

export interface StubUser {
  id: string;
  name: string;
  role: "student" | "moderator";
}

export const STUB_USERS: StubUser[] = [
  { id: "u_alice", name: "Alice Chen", role: "student" },
  { id: "u_bob", name: "Bob Singh", role: "student" },
  { id: "u_carla", name: "Carla Diaz", role: "student" },
  { id: "u_mo", name: "Mo Reyes", role: "moderator" },
];

const STORAGE_KEY = "saved-posts.currentUserId";

interface CurrentUserContextValue {
  user: StubUser;
  setUserId: (id: string) => void;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? STUB_USERS[0].id);

  const user = STUB_USERS.find((u) => u.id === userId) ?? STUB_USERS[0];

  const handleSetUserId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setUserId(id);
  };

  return (
    <CurrentUserContext.Provider value={{ user, setUserId: handleSetUserId }}>{children}</CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  return ctx;
}
