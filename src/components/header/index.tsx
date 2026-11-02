"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, XIcon } from "lucide-react";

const links = [
  { href: "/repositories", label: "Repositories" },
  { href: "/", label: "Chat" },
  { href: "/settings", label: "Settings" },
];
export const Header = () => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="app-header">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="header-inner">
        <Link
          href="/repositories"
          className="wordmark"
          onClick={() => setMenuOpen(false)}
        >
          RepoGPT
        </Link>
        <button
          type="button"
          className="mobile-menu"
          aria-label="Main menu"
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <XIcon /> : <MenuIcon />}
        </button>
        <nav
          id="main-navigation"
          aria-label="Main navigation"
          className={`main-navigation ${menuOpen ? "is-open" : ""}`}
        >
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};
