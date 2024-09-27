import React from "react";
import { cn } from "@/utils";

export default function FadeScrollContentPreview() {
  return (
    <div>
      <FadeScrollContent maskLevel={2}>
        <h1 className="mb-4 text-2xl font-bold">Fade Scroll Content</h1>
        <p>
          Lorem ipsum, dolor sit amet consectetur adipisicing elit. Doloribus,
          soluta architecto. Ducimus velit aliquam suscipit aut illum ullam
          earum, veniam quisquam, aspernatur dolorem odio ex ut possimus non
          nesciunt asperiores!
        </p>
        <h1 className="mb-4 mt-8 text-2xl font-bold">Fade Scroll Content</h1>
        <p>
          Lorem ipsum, dolor sit amet consectetur adipisicing elit. Doloribus,
          soluta architecto. Ducimus velit aliquam suscipit aut illum ullam
          earum, veniam quisquam, aspernatur dolorem odio ex ut possimus non
          nesciunt asperiores!
        </p>
        <h1 className="mb-4 mt-8 text-2xl font-bold">Fade Scroll Content</h1>
        <p>
          Lorem ipsum, dolor sit amet consectetur adipisicing elit. Doloribus,
          soluta architecto. Ducimus velit aliquam suscipit aut illum ullam
          earum, veniam quisquam, aspernatur dolorem odio ex ut possimus non
          nesciunt asperiores!
        </p>
      </FadeScrollContent>
    </div>
  );
}

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maskLevel?: 1 | 2 | 3 | 4 | 5;
}

export function FadeScrollContent({
  children,
  maskLevel = 3,
  ...props
}: Props) {
  const [scrollClass, setScrollClass] = React.useState(
    "scroll-fade-content-bottom"
  );

  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const scrollTop = ref.current.scrollTop;
        const scrollHeight =
          ref.current.scrollHeight - ref.current.clientHeight;

        ref.current.style.setProperty("--mask-level", maskLevel.toString());

        if (scrollTop === 0) {
          setScrollClass("scroll-fade-content-bottom");
        } else if (scrollTop >= scrollHeight) {
          setScrollClass("scroll-fade-content-top");
        } else if (scrollTop >= 40) {
          setScrollClass("scroll-fade-content-y");
        }
      }
    };

    const ulElement = ref.current;
    if (ulElement) {
      ulElement.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (ulElement) {
        ulElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  return (
    <div className="border-wrapper">
      <div
        ref={ref}
        className={cn(
          "max-h-64 w-full max-w-lg overflow-auto rounded-md border-wrapper p-4",
          scrollClass
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}
