import React from "react";
import { AppProvider, useApp } from "./components/app/AppContext";
import { Brand } from "./components/ui";
import Auth from "./pages/Auth";
import AppSidebar from "./components/app/AppSidebar";
import AppMain from "./components/app/AppMain";
import AppModals from "./components/app/AppModals";
function Workspace() {
  const { loading, data, refresh, meta } = useApp();
  if (loading)
    return (
      <div className="loading">
        <Brand />
        <p>Đang mở không gian của bạn…</p>
      </div>
    );
  if (!data) return <Auth onLogin={refresh} meta={meta} />;
  return (
    <div className="app-shell publishing-shell">
      <AppSidebar />
      <AppMain />
      <AppModals />
    </div>
  );
}
export default function App() {
  return (
    <AppProvider>
      <Workspace />
    </AppProvider>
  );
}
