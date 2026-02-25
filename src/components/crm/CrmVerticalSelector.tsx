import { useCrmAccess } from "@/hooks/useCrmAccess";

interface CrmVerticalSelectorProps {
  selected: string | null;
  onSelect: (vertical: string) => void;
}

const VERTICAL_LABELS: Record<string, string> = {
  car_sales: "Car Sales",
  insurance: "Insurance",
  loan: "Car Loans",
  corporate: "Corporate",
  accessories: "Accessories",
  rental: "Self-Drive Rental",
};

export function CrmVerticalSelector({ selected, onSelect }: CrmVerticalSelectorProps) {
  const { accessibleVerticals } = useCrmAccess();

  return (
    <div className="flex gap-2 flex-wrap">
      {accessibleVerticals.map((v) => (
        <button
          key={v}
          onClick={() => onSelect(v)}
          className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
            selected === v
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-muted border-border"
          }`}
        >
          {VERTICAL_LABELS[v] || v}
        </button>
      ))}
    </div>
  );
}
