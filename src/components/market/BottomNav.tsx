import { Link } from "@tanstack/react-router";
import { Home, Search, Map, Store, User } from "lucide-react";

const items = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/search", label: "البحث", icon: Search },
  { to: "/map", label: "الخريطة", icon: Map },
  { to: "/my-shop", label: "دكاني", icon: Store },
  { to: "/account", label: "حسابي", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[1000] border-t border-border bg-card shadow-soft">
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-1 py-2.5 text-sm font-medium text-muted-foreground"
              activeProps={{ className: "text-primary font-bold" }}
            >
              <Icon className="size-6" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
