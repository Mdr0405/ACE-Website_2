"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { ArrowUpRight, ClipboardList, Loader2, LogOut, Settings, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleTheme } from "./toogle-theme";
import { useAuth } from "@/components/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface RouteProps {
  href: string;
  label: string;
}

const routes: RouteProps[] = [
  { href: "/clusters", label: "Clusters" },
  { href: "/events", label: "Events" },
  { href: "/events/upcoming", label: "Upcoming" },
  { href: "/products", label: "Products" },
  { href: "/events/recruitment", label: "Recruitment" },
];

function initials(name?: string, email?: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (email?.[0] ?? "U").toUpperCase();
}

export const Navbar = () => {
  const pathname = usePathname();
  const { user, loading, isAdmin, login, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Hide on scroll down, show on scroll up; solid background once past the top.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 160);
        last = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Let sticky elements below the navbar follow it when it hides.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-nav-hidden", hidden && !open);
  }, [hidden, open]);

  // Close the menu on navigation; lock scroll while it's open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (open) window.__lenis?.stop();
    else window.__lenis?.start();
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) =>
    href === "/events" ? pathname === "/events" || /^\/events\/(?!upcoming|recruitment)/.test(pathname) : pathname.startsWith(href);

  const authControl = () => {
    if (loading) {
      return (
        <span className="grid size-10 place-items-center text-muted-foreground" aria-label="Checking sign-in">
          <Loader2 className="size-4 animate-spin" />
        </span>
      );
    }
    if (user) {
      return (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            className="grid size-10 cursor-pointer place-items-center bg-foreground text-xs font-bold text-background transition-colors hover:bg-primary hover:text-primary-foreground"
            aria-label="Account menu"
          >
            {initials(user.user_metadata?.name, user.email)}
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60 rounded-none" align="end" sideOffset={8}>
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-semibold leading-none">{user.user_metadata?.name ?? "Member"}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/user/${user.id}`} className="cursor-pointer">
                <UserIcon className="mr-2 size-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin" className="cursor-pointer">
                  <ClipboardList className="mr-2 size-4" />
                  Event registrations
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="cursor-pointer">
              <LogOut className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    return (
      <button
        type="button"
        onClick={() => login()}
        className="h-10 cursor-pointer bg-foreground px-4 text-sm font-semibold text-background transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        Sign in
      </button>
    );
  };

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 print:hidden transition-[transform,background-color,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          hidden && !open ? "-translate-y-full" : "translate-y-0",
          scrolled || open ? "border-b border-border bg-background" : "border-b border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-6 px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="ACE home">
            <Image src="/logo.svg" alt="" width={32} height={32} priority />
            <span className="text-base font-bold tracking-[-0.02em]">ACE</span>
            <span className="hidden label text-muted-foreground xl:inline">
              / SASTRA SoC
            </span>
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {routes.map((r) => (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    aria-current={isActive(r.href) ? "page" : undefined}
                    className={cn(
                      "relative px-3 py-2 text-sm font-medium transition-colors hover:text-foreground",
                      isActive(r.href) ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {r.label}
                    <span
                      className={cn(
                        "absolute inset-x-3 -bottom-0.5 h-px origin-left bg-primary transition-transform duration-500",
                        isActive(r.href) ? "scale-x-100" : "scale-x-0"
                      )}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            <ToggleTheme className="hidden lg:grid" />
            <div className="hidden lg:block">{authControl()}</div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="flex h-10 cursor-pointer items-center gap-3 px-1 text-sm font-semibold lg:hidden"
            >
              {open ? "Close" : "Menu"}
              <span aria-hidden="true" className="relative block h-3 w-6">
                <span
                  className={cn(
                    "absolute left-0 top-0 h-[1.5px] w-full bg-foreground transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    open && "translate-y-[5px] rotate-45"
                  )}
                />
                <span
                  className={cn(
                    "absolute bottom-0 left-0 h-[1.5px] w-full bg-foreground transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    open && "-translate-y-[5px] -rotate-45"
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile menu */}
      <div
        id="mobile-menu"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "fixed inset-0 z-40 flex flex-col bg-background print:hidden px-5 pb-8 pt-24 transition-[clip-path] duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] sm:px-8 lg:hidden",
          open ? "[clip-path:inset(0_0_0_0)]" : "pointer-events-none [clip-path:inset(0_0_100%_0)]"
        )}
      >
        <nav aria-label="Mobile">
          <ul className="border-t border-border">
            {[{ href: "/", label: "Home" }, ...routes, ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : [])].map((r, i) => (
              <li key={r.href} className="overflow-hidden border-b border-border">
                <Link
                  href={r.href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === r.href ? "page" : undefined}
                  style={{ transitionDelay: open ? `${0.12 + i * 0.05}s` : "0s" }}
                  className={cn(
                    "flex items-center justify-between py-4 text-[clamp(2.25rem,11vw,3.5rem)] font-bold leading-none tracking-[-0.04em] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] [font-stretch:110%]",
                    open ? "translate-y-0" : "translate-y-full",
                    pathname === r.href && "text-primary"
                  )}
                >
                  {r.label}
                  <ArrowUpRight className="size-7" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto flex items-center justify-between gap-4">
          <ToggleTheme className="border border-border" />
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/user/${user.id}`}
                onClick={() => setOpen(false)}
                className="flex h-12 items-center bg-foreground px-5 font-semibold text-background"
              >
                Your profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="flex h-12 items-center border border-border px-4 font-semibold"
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => login()}
              disabled={loading}
              className="flex h-12 items-center bg-foreground px-5 font-semibold text-background disabled:opacity-60"
            >
              Sign in with SASTRA
            </button>
          )}
        </div>
      </div>
    </>
  );
};
