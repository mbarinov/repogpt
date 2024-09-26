import type {Metadata} from "next";
import localFont from "next/font/local";
import {ThemeProvider} from 'next-themes'
import "./globals.css";

const geistSans = localFont({
    src: "./fonts/GeistVF.woff",
    variable: "--font-geist-sans",
    weight: "100 900",
});
const geistMono = localFont({
    src: "./fonts/GeistMonoVF.woff",
    variable: "--font-geist-mono",
    weight: "100 900",
});

export const metadata: Metadata = {
    title: "CyberRepo",
    description: "Talk with your repositories"
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html suppressHydrationWarning lang="en">
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
        <ThemeProvider>
            <div className="p-4 md:p-8 lg:p-12 h-full">
                {children}
            </div>
        </ThemeProvider>
        </body>
        </html>
    );
}
