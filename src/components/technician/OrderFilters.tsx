import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface OrderFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

export function OrderFilters({
  searchQuery,
  setSearchQuery,
}: OrderFiltersProps) {
  return (
    <div className="industrial-card p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por descrição..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10"
        />
      </div>
    </div>
  );
}
