import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "先停一下",
  description: "在冲动最强的 90 秒里，把选择权拿回来。",
  openGraph: { title: "先停一下", description: "把选择权拿回来", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "先停一下——把选择权拿回来" }] },
  twitter: { card: "summary_large_image", title: "先停一下", description: "把选择权拿回来", images: ["/og.png"] },
  manifest: "/manifest.webmanifest",
  applicationName: "先停一下",
  appleWebApp: { capable: true, title: "先停一下", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#11110f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
