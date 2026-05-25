import { AppHeader } from "@/features/dashboard/components/AppHeader";
import { AppSideNav } from "@/features/dashboard/components/AppSideNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-page">
      <AppHeader />
      <div className="app-body">
        <AppSideNav />
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
