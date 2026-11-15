import { Button } from "../ui/button";
import { cn } from "../ui/utils";

import { TextMenuItem } from "./TextMenu";

export function TextMenuButton(item: TextMenuItem) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={item.command}
      className={cn(
        "px-2.5 hover:bg-accent hover:text-accent-foreground",
        item.isActive() ? "bg-accent text-accent-foreground" : "",
      )}
      type="button"
    >
      {item.icon ? (
        <item.icon
          className={cn(
            "h-3.5 w-3.5",
            item.isActive() ? "text-foreground" : "text-muted-foreground",
          )}
        />
      ) : (
        <span className="text-sm font-medium text-muted-foreground">
          {item.name}
        </span>
      )}
    </Button>
  );
}
