import Image from "next/image";
import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  /** Optional photo shown in a 4:3 area at the top. alt is required. */
  image?: { src: string; alt: string };
  className?: string;
};

export function Card({ children, image, className = "" }: CardProps) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-border bg-surface shadow-sm ${className}`.trim()}
    >
      {image && (
        <div className="relative aspect-[4/3] bg-background">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            // Matches the browse grid: 1 / 2 / 3 / 4 columns.
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
