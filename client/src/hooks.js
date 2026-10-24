import { useEffect, useState } from "react";

export const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
};

export const useIsMobile = () => useMediaQuery("(max-width: 768px)");

export const usePageSize = (ref, rowHeight = 76, gap = 12, mobileSize = 8) => {
  const isMobile = useIsMobile();
  const [size, setSize] = useState(mobileSize);

  useEffect(() => {
    if (isMobile || !ref.current) {
      setSize(mobileSize);
      return undefined;
    }
    const el = ref.current;
    const measure = () => {
      const height = el.clientHeight - 12;
      setSize(Math.max(1, Math.floor((height + gap) / (rowHeight + gap))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rowHeight, gap, mobileSize, isMobile]);

  return size;
};

export const useStoredState = (key, initial) => {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? initial : JSON.parse(stored);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
    }
  }, [key, value]);
  return [value, setValue];
};

export const useServerPaging = (ref, filtersKey, rowHeight = 76) => {
  const pageSize = usePageSize(ref, rowHeight);
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [filtersKey, pageSize]);
  return { page, setPage, pageSize };
};

export const useElementSize = (ref) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return undefined;
    const el = ref.current;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
};
