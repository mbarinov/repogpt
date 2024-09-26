import { useState, useEffect, useRef, RefObject } from 'react';
import { Home, Archive, Settings, HelpCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface NavigationMenuProps {
    isOpen: boolean;
    toggleMenu: () => void;
}

export function NavigationMenu({ isOpen, toggleMenu }: NavigationMenuProps) {
    const menuRef: RefObject<HTMLDivElement> = useRef(null);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                toggleMenu();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        } else {
            document.removeEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, toggleMenu]);

    useEffect(() => {
        const handleClickOutside = () => {
            if (menuRef.current) {
                toggleMenu();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, toggleMenu]);

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (event.clientX < 50) {
                setIsExpanded(true);
            } else if(isExpanded && event.clientX > 300) {
                setIsExpanded(false);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isExpanded]);

    return (
        <>
            <div
                ref={menuRef}
                className={`fixed inset-0 z-40 transition-transform transform ${isOpen || isExpanded ? 'translate-x-0' : '-translate-x-full'} lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 shadow-lg`}
            >
                <div className="p-4 w-4/5 lg:w-full bg-gray-800 text-white h-full shadow-lg">
                    <Button onClick={toggleMenu} className="lg:hidden">
                        Close
                    </Button>
                    <nav className="mt-4">
                        <ul>
                            <li className="mb-2">
                                <a href="#" className="flex items-center p-2 hover:bg-gray-700 rounded">
                                    <Home className="mr-2" /> Home
                                </a>
                            </li>
                            <li className="mb-2">
                                <a href="#" className="flex items-center p-2 hover:bg-gray-700 rounded">
                                    <Archive className="mr-2" /> Archive
                                </a>
                            </li>
                            <li className="mb-2">
                                <a href="#" className="flex items-center p-2 hover:bg-gray-700 rounded">
                                    <Settings className="mr-2" /> Settings
                                </a>
                            </li>
                            <li className="mb-2">
                                <a href="#" className="flex items-center p-2 hover:bg-gray-700 rounded">
                                    <HelpCircle className="mr-2" /> Help
                                </a>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
            <div className={`fixed inset-0 z-30 transition-opacity ${isOpen ? 'opacity-50 shadow-overlay' : 'opacity-0 pointer-events-none'}`} />
        </>
    );
}