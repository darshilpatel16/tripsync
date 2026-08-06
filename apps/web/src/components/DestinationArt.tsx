import { destinationTheme } from "./destination-theme";

type DestinationArtProps = {
  destination: string;
  compact?: boolean;
};

export function DestinationArt({
  destination,
  compact = false,
}: DestinationArtProps) {
  const theme = destinationTheme(destination);
  // Compose classes instead of branching in JSX so compact and full artwork
  // use the same destination palette.
  const className = [
    "destination-art",
    `destination-${theme.key}`,
    compact ? "destination-art-compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // A gradient overlay keeps labels readable when a photograph is available.
  const background = theme.image
    ? {
        backgroundImage: `linear-gradient(110deg, rgb(11 51 40 / 18%), rgb(11 51 40 / 2%)), url(${theme.image})`,
      }
    : undefined;

  return (
    <div
      aria-label={`${theme.label} travel artwork`}
      className={className}
      role="img"
      style={background}
    >
      <span>{theme.icon}</span>
      <i />
      <b>{theme.label}</b>
    </div>
  );
}
