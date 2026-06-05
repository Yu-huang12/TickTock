import { NavLink, Outlet } from "react-router-dom";
import { Timer, Gamepad2, Globe, Users, BookOpen } from "lucide-react";

const navItems = [
  { to: "/", label: "Solo", icon: Gamepad2, end: true },
  { to: "/online", label: "Online", icon: Globe, end: false },
  { to: "/multiplayer", label: "Pass & Play", icon: Users, end: false },
  { to: "/how-to-play", label: "How to Play", icon: BookOpen, end: false },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="safe-top sticky top-0 z-30 border-b border-border/60 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <NavLink to="/" className="group flex items-center gap-2">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg transition-transform group-hover:scale-105">
              <Timer className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-gradient">
              Tick&nbsp;Tock&nbsp;Challenge
            </span>
          </NavLink>
          <nav className="flex items-center gap-1">
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
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Outlet />
        </div>
      </main>

      <footer className="safe-bottom border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Tick Tock Challenge · test your inner clock ⏱️
      </footer>
    </div>
  );
}
