import { Loader2Icon } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      className={cn("size-4 animate-spin", className)}
      {...props}
    >
      <title>loader-5</title>
      <g fill="currentColor">
        <path
          d="m9.75,1.0381v4.0376c.5464.1038,1.0542.3147,1.4974.6165l2.8513-2.8513c-1.2042-.9985-2.7051-1.6492-4.3486-1.8027Z"
          strokeWidth="0"
          opacity="0.5"
        ></path>
        <path
          d="m5.0756,8.25c.1039-.5464.3149-1.0542.6166-1.4973l-2.8513-2.8513c-.9987,1.2041-1.6491,2.7051-1.8028,4.3486h4.0375Z"
          strokeWidth="0"
          opacity="0.5"
        ></path>
        <path
          d="m5.0756,9.75H1.038c.1537,1.6436.8041,3.1445,1.8028,4.3486l2.8513-2.8513c-.3017-.4431-.5127-.9509-.6166-1.4973Z"
          strokeWidth="0"
        ></path>
        <path
          d="m12.9244,9.75c-.1039.5464-.3148,1.0542-.6165,1.4973l2.8513,2.8513c.9987-1.2041,1.6491-2.7051,1.8028-4.3486h-4.0375Z"
          strokeWidth="0"
          opacity="0.5"
        ></path>
        <path
          d="m12.3079,6.7527c.3018.4431.5126.9509.6165,1.4973h4.0375c-.1537-1.6436-.8041-3.1445-1.8028-4.3486l-2.8513,2.8513Z"
          strokeWidth="0"
        ></path>
        <path
          d="m11.2473,12.3079c-.4432.3018-.9509.5127-1.4973.6165v4.0376c1.6435-.1536,3.1444-.8042,4.3486-1.8027l-2.8513-2.8513Z"
          strokeWidth="0"
        ></path>
        <path
          d="m8.25,12.9243c-.5464-.1038-1.0541-.3147-1.4973-.6165l-2.8513,2.8513c1.2042.9985,2.7051,1.6492,4.3486,1.8027v-4.0376Z"
          strokeWidth="0"
          opacity="0.5"
        ></path>
        <path
          d="m6.7526,5.6921c.4432-.3018.951-.5127,1.4974-.6165V1.0381c-1.6435.1536-3.1444.8042-4.3486,1.8027l2.8513,2.8513Z"
          strokeWidth="0"
        ></path>
      </g>
    </svg>
  );
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
