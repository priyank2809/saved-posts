import { useState } from "react";
import { TopBar } from "./components/TopBar";
import { FeedPage } from "./pages/FeedPage";
import { SavedPage } from "./pages/SavedPage";

export default function App() {
  const [tab, setTab] = useState<"feed" | "saved">("feed");

  return (
    <div className="app-shell">
      <TopBar activeTab={tab} onTabChange={setTab} />
      <main className="app-main">{tab === "feed" ? <FeedPage /> : <SavedPage />}</main>
    </div>
  );
}
