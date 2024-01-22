import "~/styles/globals.css";

import { Inter } from "next/font/google";
import NextAuthProvider from "~/providers/NextAuthProvider";
import { SiteNav } from "~/components/main-nav";
import { Toaster } from "@/components/ui/sonner"
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Flowify",
  description: "Generated by create-t3-app",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable} dark`}>
        <NextAuthProvider>
          <SiteNav />
          {children}
          <Toaster expand={true} richColors/>
        </NextAuthProvider>
      </body>
    </html>
  );
}
