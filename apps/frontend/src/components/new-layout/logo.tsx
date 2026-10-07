'use client';

// Tadween mark: the Arabic letter ت (taa, first letter of تدوين) as a reed-pen stroke with two
// diamond qalam dots; the second dot is Papyrus, the colour of the smart layer.
export const Logo = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="44"
      height="44"
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Tadween"
      className="mt-[8px] min-w-[44px] min-h-[44px]"
    >
      <rect width="64" height="64" rx="15" fill="var(--tdw-primary-strong, #0b7062)" />
      <g transform="translate(-0.5 1.5)">
        <path
          d="M12 31 C 14.5 43.5, 24 49.5, 35 48 C 45.5 46.5, 52 37.5, 53 21 C 49.5 32.5, 43.5 39.5, 34.5 40.5 C 25 41.5, 17 38.5, 12 31 Z"
          fill="#ffffff"
        />
        <path d="M25 18.5 L29.5 23 L25 27.5 L20.5 23 Z" fill="#ffffff" />
        <path d="M37 18.5 L41.5 23 L37 27.5 L32.5 23 Z" fill="#f2b54a" />
      </g>
    </svg>
  );
};
