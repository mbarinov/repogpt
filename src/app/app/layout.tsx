"use client";

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { NavigationMenu } from "@/components/navigation-menu";

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);

    const toggleSidePanel = () => {
        setIsSidePanelOpen(prevState => !prevState);
    };

    return (
        <div
            className={`flex flex-col bg-beige-100 text-beige-900 h-full`}>
            <header className="p-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-wider">CyberRepo</h1>

                <Button onClick={toggleSidePanel} className="lg:hidden">
                    <Menu/>
                </Button>
            </header>
            <NavigationMenu isOpen={isSidePanelOpen}
                            toggleMenu={toggleSidePanel}/>
            <div className={`flex-grow ${isSidePanelOpen ? 'lg:ml-64' : ''}`}>
                {children}
            </div>
            <div className="hidden lg:block fixed bottom-4 left-4">
                <Button onClick={toggleSidePanel}>
                    <Menu/>
                </Button>
            </div>

        </div>
    );
}