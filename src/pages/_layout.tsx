import { NavLink, Outlet } from "react-router-dom";
import { Timer, Gamepad2, Globe, Users, BookOpen } from "lucide-react";

const navItems = [
  { to: "/", label: "Solo", short: "Solo", icon: Gamepad2, end: true },
  { to: "/online", label: "Online", short: "Online", icon: Globe, end: false },
  { to: "/multiplayer", label: "Pass & Play", short: "Local", icon: Users, end: false },
  { to: "/how-to-play", label: "How to Play", short: "Guide", icon: BookOpen, end: false },
];

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Compact app header */}
      <header className="safe-top sticky top-0 z-30 border-b border-white/10 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-4 px-4 md:h-16 md:max-w-5xl">
          <NavLink to="/" className="group flex items-center gap-2">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg transition-transform group-active:scale-95 md:h-9 md:w-9">
              <Timer className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="text-base font-extrabold tracking-tight text-gradient md:text-lg">
              Tick&nbsp;Tock
            </span>
          </NavLink>

          {/* Desktop top nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/20 text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-10">
        <div className="mx-auto max-w-2xl px-4 py-5 md:max-w-5xl md:py-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom tab bar (mobile only) */}
      <nav className="tab-bar md:hidden">
        {navItems.map(({ to, short, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5"
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full transition-all ${
                    isActive
                      ? "bg-gradient-to-br from-primary/30 to-secondary/30 text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className={`text-[11px] font-medium transition-colors ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {short}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
