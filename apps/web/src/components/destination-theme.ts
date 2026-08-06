export type DestinationTheme = {
  key: string;
  label: string;
  icon: string;
  image?: string;
};

// Keep the most specific aliases first. This lets a city such as Barcelona use
// its coastal treatment without changing the trip data stored by the API.
const destinationThemes: Array<[RegExp, DestinationTheme]> = [
  [
    /new york|nyc|manhattan|brooklyn/i,
    {
      key: "new-york",
      label: "New York",
      icon: "\u{1F5FD}",
      image: "https://images.unsplash.com/photo-1522083165195-3424ed129620?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  [
    /london|united kingdom|england/i,
    {
      key: "london",
      label: "London",
      icon: "\u{1F3DB}\u{FE0F}",
      image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  [
    /japan|tokyo|kyoto|osaka/i,
    {
      key: "japan",
      label: "Japan",
      icon: "\u{26E9}\u{FE0F}",
      image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  [
    /paris|france/i,
    {
      key: "paris",
      label: "Paris",
      icon: "\u{1F5FC}",
      image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  [
    /italy|rome|amalfi|venice|florence/i,
    {
      key: "italy",
      label: "Italy",
      icon: "\u{1F3DB}\u{FE0F}",
      image: "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  [
    /beach|island|bali|maldives|barcelona/i,
    {
      key: "coast",
      label: "Coastal escape",
      icon: "\u{1F334}",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    },
  ],
];

const defaultTheme = (destination: string): DestinationTheme => ({
  key: "adventure",
  label: destination || "Your adventure",
  icon: "\u{2708}\u{FE0F}",
});

export function destinationTheme(destination: string): DestinationTheme {
  return (
    destinationThemes.find(([pattern]) => pattern.test(destination))?.[1] ??
    defaultTheme(destination)
  );
}
