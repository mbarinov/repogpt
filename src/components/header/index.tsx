'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MenuIcon, XIcon } from 'lucide-react';

export const Header = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <header className="sticky top-0 bg-white dark:bg-gray-800 shadow-md z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">repogpt</h1>
                        </Link>
                    </div>

                    <div className="hidden md:flex md:items-center">
                        <nav className="ml-10 flex items-baseline space-x-4">
                            <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-blue-500 px-3 py-2 rounded-md text-sm font-medium">
                                Main
                            </Link>
                            <Link href="/repositories" className="text-gray-700 dark:text-gray-300 hover:text-blue-500 px-3 py-2 rounded-md text-sm font-medium">
                                Repositories
                            </Link>
                            <Link href="/settings" className="text-gray-700 dark:text-gray-300 hover:text-blue-500 px-3 py-2 rounded-md text-sm font-medium">
                                Settings
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center md:hidden">
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-blue-500 focus:outline-none"
                            aria-label="Main menu"
                        >
                            {menuOpen ? (
                                <XIcon className="h-6 w-6" />
                            ) : (
                                <MenuIcon className="h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {menuOpen && (
                <div className="md:hidden bg-gray-100 dark:bg-gray-700">
                    <nav className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link href="/" className="block text-gray-700 dark:text-gray-300 hover:text-blue-500 px-3 py-2 rounded-md text-base font-medium" onClick={() => setMenuOpen(false)}>
                            Main
                        </Link>
                        <Link href="/repositories" className="block text-gray-700 dark:text-gray-300 hover:text-blue-500 px-3 py-2 rounded-md text-base font-medium" onClick={() => setMenuOpen(false)}>
                            Repositories
                        </Link>
                        <Link href="/settings" className="block text-gray-700 dark:text-gray-300 hover:text-blue-500 px-3 py-2 rounded-md text-base font-medium" onClick={() => setMenuOpen(false)}>
                            Settings
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    );
};