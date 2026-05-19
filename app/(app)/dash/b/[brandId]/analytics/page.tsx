import { AnalyticsKPIs } from "@/features/analytics/components/AnalyticsKPIs";
import { BitsChart } from "@/features/analytics/components/BitsChart";
import { ChannelBars } from "@/features/analytics/components/ChannelBars";
import { ModelSpend } from "@/features/analytics/components/ModelSpend";
import { TopPosts } from "@/features/analytics/components/TopPosts";
import { StudioSwitcher } from "@/features/dashboard/components/StudioSwitcher";

export default function AnalyticsPage() {
  return (
    <>
      <div className="app-page-head">
        <div>
          <span className="crumbs">Studios / Lumen Botanicals / Analytics</span>
          <h1>
            What worked, <em>and what didn&rsquo;t.</em>
          </h1>
        </div>
        <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
          <button type="button" className="btn btn-sm btn-ghost">
            Last 30 days
          </button>
          <button type="button" className="btn btn-sm btn-primary btn-arrow">
            Export client report
          </button>
        </div>
      </div>

      <div className="mt-24">
        <StudioSwitcher />
      </div>

      <div className="mt-16">
        <AnalyticsKPIs />
      </div>

      <div className="grid-2 mt-24">
        <BitsChart />
        <ModelSpend />
      </div>

      <div className="grid-2 mt-24">
        <ChannelBars />
        <TopPosts />
      </div>
    </>
  );
}
