import { ChannelsRail } from "@/features/dashboard/components/ChannelsRail";
import { RecentPosts } from "@/features/dashboard/components/RecentPosts";
import { StudioSwitcher } from "@/features/dashboard/components/StudioSwitcher";
import { TodayQueue } from "@/features/dashboard/components/TodayQueue";
import { WalletStrip } from "@/features/dashboard/components/WalletStrip";
import { WelcomeHeading } from "@/features/dashboard/components/WelcomeHeading";
import { WhenToPost } from "@/features/dashboard/components/WhenToPost";
import { Winner } from "@/features/dashboard/components/Winner";

const KPIS = [
  { label: "Reach · 7d", value: "184.2K", trend: "+12.4%", dir: "up" as const },
  { label: "Engagement", value: "8.6%", trend: "+0.8 pp", dir: "up" as const },
  { label: "Posts shipped", value: "27", trend: "of 32 planned", dir: "up" as const },
  { label: "Best channel", value: "LinkedIn", trend: "↗ carousels", dir: "up" as const },
];

export default function DashboardPage() {
  return (
    <>
      <div className="app-page-head">
        <div>
          <WelcomeHeading />
        </div>
        <span className="caption">Last sync 2 minutes ago</span>
      </div>

      <div className="mt-24">
        <StudioSwitcher />
      </div>

      <div className="grid-4 mt-16">
        {KPIS.map((k) => (
          <div key={k.label} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value tabular">{k.value}</div>
            <div className={`kpi-trend ${k.dir}`}>{k.trend}</div>
          </div>
        ))}
      </div>

      <WalletStrip />

      <div className="grid-hero mt-32">
        <Winner />
        <ChannelsRail />
      </div>

      <div className="grid-2 mt-32">
        <WhenToPost />
        <TodayQueue />
      </div>

      <RecentPosts />
    </>
  );
}
