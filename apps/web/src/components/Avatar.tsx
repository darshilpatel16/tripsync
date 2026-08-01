type AvatarProps = {
  name: string;
  photo?: string | null;
  size?: "small" | "large";
};

export function Avatar({ name, photo, size = "small" }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return photo ? (
    <img className={`avatar avatar-${size}`} src={photo} alt={`${name}'s profile`} />
  ) : (
    <span className={`avatar avatar-${size} avatar-fallback`} aria-label={`${name}'s profile`}>
      {initials || "?"}
    </span>
  );
}
