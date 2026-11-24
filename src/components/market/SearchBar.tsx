import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";

export function SearchBar({ initial = "" }: { initial?: string }) {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate({ to: "/search", search: { q: q.trim() || undefined, cat: undefined } });
      }}
      className="flex items-center gap-2 rounded-2xl border-2 border-primary bg-card p-2 shadow-soft"
    >
      <Search className="ms-2 size-7 shrink-0 text-primary" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ابحث عن منتج، مثل بطاطا..."
        className="h-12 min-w-0 flex-1 bg-transparent text-xl outline-none placeholder:text-muted-foreground"
        aria-label="ابحث عن منتج"
      />
      <button type="submit" className="h-12 rounded-xl bg-primary px-5 text-lg font-bold text-primary-foreground">
        ابحث
      </button>
    </form>
  );
}
