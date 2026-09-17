import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SiteFooter } from "@/app/_components/site-footer";
import { SiteHeader } from "@/app/_components/site-header";
import "./globals.css";

// next/font downloads the font at build time and serves it from this site,
// so visitors' browsers never contact Google.
const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Screen Recorder — private screen recording in your browser",
    template: "%s · Screen Recorder",
  },
  description:
    "Record your screen, voice and webcam as a sharp MP4 with live English captions. Runs entirely in your browser — nothing is uploaded.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
