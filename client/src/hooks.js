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

// Koľko riadkov sa zmestí do plochy zoznamu bez skrolovania.
// Na mobile sa skroluje normálne, tam stačí pevný počet.
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
      // 12 px je padding plochy (miesto pre tiene kariet).
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

// Pamätá si hodnotu v prehliadači (napr. zbalené menu), prežije prekliknutie aj obnovenie stránky.
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
      // Súkromné okno alebo plné úložisko: nevadí, len si to nezapamätá.
    }
  }, [key, value]);
  return [value, setValue];
};

// Zoznam stránkovaný na serveri: veľkosť strany podľa miesta na obrazovke,
// pri zmene filtra späť na prvú stranu.
export const useServerPaging = (ref, filtersKey, rowHeight = 76) => {
  const pageSize = usePageSize(ref, rowHeight);
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [filtersKey, pageSize]);
  return { page, setPage, pageSize };
};

// Šírka a výška prvku (napr. kalendára), aby sa rozloženie prispôsobilo miestu, nie oknu.
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
