import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "RepoGPT",
  description: "Talk with your repositories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className="font-sans antialiased">
        <>
          <Header />
          <main id="main-content" className="app-main">
            {children}
          </main>
          <Toaster />
        </>
      </body>
    </html>
  );
}
