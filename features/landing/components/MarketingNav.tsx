import { ThemeToggle } from "@/components/ui/ThemeToggle";
import Link from "next/link";

export function MarketingNav() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link className="brand" href="/">
          <span className="brand-mark" />
          OmniGrowth
        </Link>
        <nav className="nav-links">
          <a href="#features">Features</a>
          <a href="#demo">Live demo</a>
          <a href="#compare">Compare</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <span className="wax-tag">Closed Beta</span>
        </nav>
        <div className="nav-cta">
          <ThemeToggle />
          <Link className="btn btn-sm btn-ghost" href="/login">
            Sign in
          </Link>
          <Link className="btn btn-sm btn-primary btn-arrow" href="/login">
            Open the app
          </Link>
        </div>
      </div>
    </header>
  );
}
