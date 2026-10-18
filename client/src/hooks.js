import { useEffect, useState } from "react";

// Počká, kým používateľ dopíše, a až potom pošle vyhľadávanie.
export const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};
