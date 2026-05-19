"use client";

import { useEffect } from "react";

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add("app-page");
    return () => {
      document.body.classList.remove("app-page");
    };
  }, []);

  return <>{children}</>;
}
