/** Start here when adapting the template. Public values only; no secrets. */
export const siteConfig = {
  brand: "United Nations",
  name: "Results",
  description: "Results from the United Nations Secretariat and UN System.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  navigation: [
    { href: "/", label: "UN Secretariat", requiresAuth: false },
    { href: "/un-system", label: "UN System", requiresAuth: false },
  ],
  analytics: {
    scriptUrl: process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL,
    websiteId: process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID,
  },
} as const;
export const pageContainer = "mx-auto w-full max-w-6xl px-4 sm:px-8 lg:px-16";
