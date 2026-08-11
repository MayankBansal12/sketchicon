import type { CatalogIconMetadata, IconProvider } from "../generated/catalog";

export type ProviderFilter = "all" | IconProvider;

export const providers: readonly { id: ProviderFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "lucide", label: "Lucide" },
  { id: "hugeicons", label: "Hugeicons" },
];

export const filters = [
  { id: "all", label: "All icons", pattern: null },
  { id: "accessibility", label: "Accessibility", pattern: /accessibility|audio|blind|braille|contrast|ear|eye|glasses|hand|person|user|volume|wheelchair/ },
  { id: "animals", label: "Animals", pattern: /bird|bug|cat|dog|fish|rabbit|rat|snail|squirrel|turtle|worm/ },
  { id: "arrows", label: "Arrows", pattern: /arrow|chevron|corner|move|redo|undo/ },
  { id: "charts", label: "Charts", pattern: /activity|chart|gauge|goal|kanban|panel|pie|presentation|sigma|table|trending/ },
  { id: "communication", label: "Communication", pattern: /mail|message|phone|send|radio|rss/ },
  { id: "devices", label: "Devices", pattern: /battery|bluetooth|camera|cast|computer|cpu|disc|gamepad|hard-drive|headphone|keyboard|laptop|monitor|mouse|printer|router|scanner|smartphone|speaker|tablet|tv|usb|webcam|wifi/ },
  { id: "files", label: "Files", pattern: /file|folder|archive|clipboard/ },
  { id: "food", label: "Food", pattern: /apple|banana|bean|beef|beer|cake|candy|carrot|chef|cherry|coffee|croissant|cup|egg|fish|grape|ham|ice-cream|milk|pizza|popcorn|salad|sandwich|soup|utensils|wheat|wine/ },
  { id: "media", label: "Media", pattern: /play|pause|volume|music|video|camera|image/ },
  { id: "medical", label: "Medical", pattern: /ambulance|bandage|brain|cross|dna|heart|hospital|pill|siren|stethoscope|syringe|thermometer/ },
  { id: "nature", label: "Nature", pattern: /cloud|droplet|earth|flower|leaf|mountain|orbit|plant|sprout|sun|tree|waves|wind/ },
  { id: "security", label: "Security", pattern: /badge|ban|circle-alert|circle-check|circle-x|fingerprint|key|lock|scan|shield|unlock|vault/ },
  { id: "shapes", label: "Shapes", pattern: /circle|square|triangle|diamond|octagon/ },
  { id: "text", label: "Text", pattern: /align|baseline|bold|case|heading|indent|italic|letter|list|pilcrow|quote|strikethrough|text|type|underline/ },
  { id: "transportation", label: "Transportation", pattern: /ambulance|bike|bus|car|fuel|plane|rocket|route|ship|train|truck/ },
  { id: "weather", label: "Weather", pattern: /sun|moon|cloud|rain|snow|wind|thermometer/ },
] as const;

export type FilterId = (typeof filters)[number]["id"];

export function getFilterCounts(
  catalog: readonly CatalogIconMetadata[],
  provider: ProviderFilter,
) {
  const providerCatalog = provider === "all"
    ? catalog
    : catalog.filter((item) => item.provider === provider);
  return Object.fromEntries(
    filters.map((filter) => [
      filter.id,
      filter.pattern
        ? providerCatalog.filter((item) => filter.pattern.test(item.label)).length
        : providerCatalog.length,
    ]),
  ) as Record<FilterId, number>;
}

export function filterCatalog(
  catalog: readonly CatalogIconMetadata[],
  query: string,
  activeFilter: string,
  provider: ProviderFilter = "all",
) {
  const queryTokens = query.trim().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const filter = filters.find((item) => item.id === activeFilter) ?? filters[0];
  return catalog.filter((item) =>
    (provider === "all" || item.provider === provider) &&
    (!filter.pattern || filter.pattern.test(item.label)) &&
    queryTokens.every((token) => item.searchText.includes(token)),
  );
}
