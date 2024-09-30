import type {Metadata} from "next";
import {ThemeProvider} from 'next-themes'
import { Toaster } from "@/components/ui/toaster"
import "./globals.css";

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
            className={`antialiased`}
        >
        <ThemeProvider>
            <div className="p-4 md:p-8 lg:p-12 h-full">
                <div
                    className={`flex flex-col bg-beige-100 text-beige-900 h-full`}>
                    <header className="p-4 flex justify-between items-center">
                        <h1 className="text-2xl font-bold tracking-wider">CyberRepo</h1>
                    </header>
                    <main className="flex-grow">
                        {children}
                    </main>
                </div>
            </div>
            <Toaster />
        </ThemeProvider>
        </body>
        </html>
    );
}
