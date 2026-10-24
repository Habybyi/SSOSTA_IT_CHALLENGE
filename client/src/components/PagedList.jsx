import { useEffect, useRef, useState } from "react";
import { Pager } from "./Pager";
import { usePageSize } from "../hooks";
import styles from "../styles/neumorphic.module.css";

export const PagedList = ({ items, renderItem, rowHeight = 76, empty, getKey = (item) => item.id }) => {
  const ref = useRef(null);
  const pageSize = usePageSize(ref, rowHeight);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const visible = items.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className={styles.fill}>
      <div ref={ref} className={styles.viewport} style={{ "--row-h": `${rowHeight}px` }}>
        {items.length === 0 ? empty : visible.map((item, i) => <div key={getKey(item, i)} style={{ flex: "none" }}>{renderItem(item)}</div>)}
      </div>
      <Pager page={page} pageSize={pageSize} total={items.length} onChange={setPage} />
    </div>
  );
};
