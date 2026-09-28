import { cn } from "@/lib/utils";

/** Bloque de carga: pulso de opacidad (nunca `transform`), tono `line-2`. */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-control bg-line-2 motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
