import { useCallback, useEffect, useState } from "react";

export function useLocalStorageFlag(
  key: string
): [boolean, (val: boolean | null) => void] {
  const [value, setValue] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(key) === "true";
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setValue(e.newValue === "true");
    };
    window.addEventListener("storage", onStorage);

    const interval = setInterval(() => {
      const current = localStorage.getItem(key) === "true";
      setValue((prev) => (prev !== current ? current : prev));
    }, 1000);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, [key]);

  const setFlag = useCallback(
    (val: boolean | null) => {
      if (val === null || val === false) {
        localStorage.removeItem(key);
        setValue(false);
      } else {
        localStorage.setItem(key, "true");
        setValue(true);
      }
    },
    [key]
  );

  return [value, setFlag];
}
