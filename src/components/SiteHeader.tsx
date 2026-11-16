"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { SiteHeader as SharedHeader } from "@un-eosg/ui/components/site-header";
import { siteConfig } from "@/lib/site-config";
import { withBasePath } from "@/lib/paths";

export function SiteHeader({
  children,
  navigation = siteConfig.navigation,
  homeHref = "/",
}: {
  children?: React.ReactNode;
  navigation?: readonly { href: string; label: string }[];
  homeHref?: string;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const header = wrapper.current?.querySelector("header");
    if (!header) return;

    const rootStyle = document.documentElement.style;
    const updateHeight = () => {
      rootStyle.setProperty(
        "--site-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    };
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(header, { box: "border-box" });
    return () => {
      observer.disconnect();
      rootStyle.removeProperty("--site-header-height");
    };
  }, []);

  const pathname = usePathname();
  return (
    <div ref={wrapper} className="contents">
      <SharedHeader
        brand={siteConfig.brand}
        descriptor={siteConfig.name}
        href={withBasePath(homeHref)}
        homeLabel={`${siteConfig.name} home`}
        navItems={navigation.map((item) => ({
          label: item.label,
          href: withBasePath(item.href),
        }))}
        activeHref={withBasePath(pathname.replace(/\/$/, "") || "/")}
        mobileMenuLabel="Open navigation menu"
        emblemPlacement="outboard"
        transparency="low"
        containerClassName="max-w-6xl px-6 sm:px-8 lg:px-16"
      >
        {children}
      </SharedHeader>
    </div>
  );
}
