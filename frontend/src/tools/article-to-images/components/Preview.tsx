import { useEffect, useRef, useState } from 'react';
import type { Snapshot } from '../model';
import { buildPage, type Pagination } from '../rendering';

export default function Preview({
  snapshot,
  pagination,
  index,
}: {
  snapshot: Snapshot;
  pagination: Pagination;
  index: number;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(380);
  useEffect(() => {
    if (!wrapper.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setWidth(
        Math.max(
          1,
          Math.min(width, (height * snapshot.layout.width) / snapshot.layout.height, 520),
        ),
      );
    });
    observer.observe(wrapper.current);
    return () => observer.disconnect();
  }, [snapshot.layout.width, snapshot.layout.height]);
  useEffect(() => {
    if (paper.current && pagination.pages[index])
      paper.current.replaceChildren(buildPage(snapshot, pagination, index));
  }, [snapshot, pagination, index]);
  return (
    <div ref={wrapper} className="paper-wrapper">
      <div
        className="paper-shell"
        style={{ width, height: (width * snapshot.layout.height) / snapshot.layout.width }}
      >
        <div ref={paper} className="paper-inner" style={{ transform: `scale(${width / 1080})` }} />
      </div>
    </div>
  );
}
