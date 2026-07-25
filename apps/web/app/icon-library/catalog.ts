import { iconCatalog } from "../generated/catalog";

export const filters = [
  { id: "all", label: "All icons", pattern: null },
  { id: "arrows", label: "Arrows", pattern: /arrow|chevron|corner|move|redo|undo/ },
  { id: "communication", label: "Communication", pattern: /mail|message|phone|send|radio|rss/ },
  { id: "files", label: "Files", pattern: /file|folder|archive|clipboard/ },
  { id: "media", label: "Media", pattern: /play|pause|volume|music|video|camera|image/ },
  { id: "shapes", label: "Shapes", pattern: /circle|square|triangle|diamond|octagon/ },
  { id: "weather", label: "Weather", pattern: /sun|moon|cloud|rain|snow|wind|thermometer/ },
] as const;

export type FilterId = (typeof filters)[number]["id"];

export const filterCounts = Object.fromEntries(
  filters.map((filter) => [
    filter.id,
    filter.pattern
      ? iconCatalog.filter((item) => filter.pattern.test(item.label)).length
      : iconCatalog.length,
  ]),
) as Record<FilterId, number>;

export function filterCatalog(query: string, activeFilter: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const filter = filters.find((item) => item.id === activeFilter) ?? filters[0];
  return iconCatalog.filter((item) =>
    (!filter.pattern || filter.pattern.test(item.label)) && item.searchText.includes(normalizedQuery),
  );
}
