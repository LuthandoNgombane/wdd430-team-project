import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/domain";

type ListingFiltersProps = {
  neighborhoods: readonly string[];
  neighborhood: string;
  category: string;
};

/**
 * A plain GET form: choosing options and pressing "Filter" puts them in the
 * address (?neighborhood=...&category=...), so the link can be shared.
 * It also works without JavaScript.
 */
export function ListingFilters({
  neighborhoods,
  neighborhood,
  category,
}: ListingFiltersProps) {
  return (
    <form
      // New key whenever the filters change, so the dropdowns reset on "Clear filters".
      key={`${neighborhood}|${category}`}
      method="get"
      action="/listings"
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
    >
      <div className="sm:w-64">
        <Select
          id="filter-neighborhood"
          name="neighborhood"
          label="Neighborhood"
          options={neighborhoods}
          placeholder="All neighborhoods"
          defaultValue={neighborhood}
        />
      </div>
      <div className="sm:w-64">
        <Select
          id="filter-category"
          name="category"
          label="Category"
          options={CATEGORIES}
          placeholder="All categories"
          defaultValue={category}
        />
      </div>
      <Button type="submit">Filter</Button>
    </form>
  );
}