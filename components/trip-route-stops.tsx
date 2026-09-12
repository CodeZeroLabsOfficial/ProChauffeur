import { cn } from "@/lib/utils";

function RoutePin({ variant }: { variant: "pickup" | "dropoff" }) {
  const isPickup = variant === "pickup";
  return (
    <span
      className={cn(
        "mt-0.5 flex size-3 shrink-0 items-center justify-center rounded-full border-2",
        isPickup ? "border-primary" : "border-muted-foreground/50"
      )}>
      <span
        className={cn(
          "size-1 rounded-full",
          isPickup ? "bg-primary" : "bg-muted-foreground/50"
        )}
      />
    </span>
  );
}

export function TripRouteStops({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  return (
    <div className="flex flex-col pt-1">
      <div className="flex items-start gap-3">
        <div className="flex w-3 shrink-0 flex-col items-center self-stretch">
          <RoutePin variant="pickup" />
          <span className="border-border w-0 flex-1 border-l border-dashed" />
        </div>
        <p className="text-muted-foreground min-w-0 flex-1 pb-4 text-xs break-words">{pickup}</p>
      </div>
      <div className="flex items-start gap-3">
        <div className="flex w-3 shrink-0 justify-center">
          <RoutePin variant="dropoff" />
        </div>
        <p className="text-muted-foreground min-w-0 flex-1 text-xs break-words">{dropoff}</p>
      </div>
    </div>
  );
}
