import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "repogpt",
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
        <ThemeProvider attribute="class">
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:pt-20 h-full">
            {children}
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
