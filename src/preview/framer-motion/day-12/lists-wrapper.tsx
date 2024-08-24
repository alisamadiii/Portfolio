import React, { memo, useEffect, useRef, useState } from "react";
import { List, AutoSizer, ScrollSync } from "react-virtualized";
import DateList from "./date-list";
import { isToday } from "date-fns";
import { LayoutGroup } from "framer-motion";
import AnyList from "./any-list";
import { cn } from "@/utils";

interface Props {
  data: any[];
  id: string;
  type: "date" | "any";
  className?: string;
  setValue: (value: string | null) => void;
}

const ListsWrapper = memo(({ data, id, type, className, setValue }: Props) => {
  const [scrollTop, setScrollTop] = useState(0);

  const listRef = useRef<any>(null);
  const rowHeight = 33;

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (listRef.current) {
        const middleIndex =
          Math.floor(scrollTop / rowHeight) + Math.floor(208 / rowHeight / 2);
        const offset = middleIndex * rowHeight - (208 / 2 - rowHeight / 2);
        listRef.current.scrollToPosition(offset);

        const middleElement = document.querySelector(
          `[data-index="${middleIndex}"]`
        );

        if (middleElement) {
          const dateTimeValue = middleElement.getAttribute("dateTime");
          setValue(dateTimeValue);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timeout);
    };
  }, [scrollTop]);

  useEffect(() => {
    if (listRef.current) {
      const todayIndex = data.findIndex((day) => isToday(day));
      if (todayIndex !== -1) {
        const offset = todayIndex * rowHeight - (208 / 2 - rowHeight / 2);
        listRef.current.scrollToPosition(offset);
      }
    }
  }, []);

  return (
    <ScrollSync>
      {({ scrollTop: syncedScrollTop, onScroll }) => {
        if (syncedScrollTop !== scrollTop) {
          setScrollTop(syncedScrollTop);
        }

        return (
          <div className={cn("relative h-[208px] w-full", className)}>
            <AutoSizer>
              {({ height, width }) => {
                const visibleRowsCount = Math.floor(height / rowHeight);
                const middleIndex =
                  Math.floor(scrollTop / rowHeight) +
                  Math.floor(visibleRowsCount / 2);

                return (
                  <LayoutGroup id={id}>
                    <List
                      ref={listRef}
                      width={width}
                      height={height}
                      rowHeight={33}
                      rowCount={data.length}
                      onScroll={onScroll}
                      rowRenderer={({ key, index, style, parent }) =>
                        type === "date" ? (
                          <DateList
                            key={key}
                            index={index}
                            style={style}
                            rowHeight={rowHeight}
                            daysFrom2015To2030={data}
                            middleIndex={middleIndex}
                          />
                        ) : (
                          <AnyList
                            key={key}
                            index={index}
                            style={style}
                            values={data}
                            rowHeight={rowHeight}
                            middleIndex={middleIndex}
                          />
                        )
                      }
                    />
                  </LayoutGroup>
                );
              }}
            </AutoSizer>
          </div>
        );
      }}
    </ScrollSync>
  );
});

ListsWrapper.displayName = "ListsWrapper";

export default ListsWrapper;

export function ListsWrapperNoOptimization({
  data,
  name,
  setValue,
}: {
  data: Array<string | number>;
  name: string;
  setValue: (value: any) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  const [scrollTop, setScrollTop] = useState(0);

  const rowHeight = 33;

  const handleScroll = () => {
    if (listRef.current) {
      setScrollTop(listRef.current.scrollTop);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (listRef.current) {
        const middleIndex =
          Math.floor(scrollTop / rowHeight) + Math.floor(208 / rowHeight / 2);
        const offset = middleIndex * rowHeight - (208 / 2 - rowHeight / 2);
        listRef.current.scrollTo({
          top: offset,
          behavior: "smooth",
        });

        const middleElement = document.querySelector(
          `[data-name="${name}-${middleIndex}"]`
        );

        console.log(middleElement);

        if (middleElement) {
          const dateTimeValue = middleElement.getAttribute("data-value");
          setValue(dateTimeValue);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timeout);
    };
  }, [scrollTop]);

  return (
    <ul
      ref={listRef}
      onScroll={handleScroll}
      className="no-scrollbar flex h-[208px] w-full flex-col items-center overflow-y-auto overflow-x-hidden px-4"
    >
      {data.map((d, dIndex) => (
        <li
          key={dIndex}
          className="fixed-size-flex flex h-[33px] items-center justify-end py-4"
          data-name={`${name}-${dIndex}`}
          data-value={d}
        >
          {d}
        </li>
      ))}
    </ul>
  );
}
