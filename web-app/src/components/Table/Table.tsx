import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { TextInput, Select } from "@mantine/core";
import { IconArrowsSort, IconChevronDown, IconChevronUp, IconSearch } from "@tabler/icons-react";
import styles from "./Table.module.css";

const DEFAULT_MIN_WIDTH = 80;

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  // px floor a dragged-narrow column can't go below. Also the width used
  // for its flex track (minmax(minWidth, 1fr)) before it's ever resized.
  minWidth?: number;
  enableSort?: boolean;
}

export interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface TableSortProps {
  // Which column key is currently driving the sort, or null for
  // whatever default order the caller's own query already applies.
  activeKey: string | null;
  direction: "asc" | "desc";
  // Reports "this column's header was clicked" -- Table has no opinion on
  // what asc/desc/switching-columns should do next, that toggle logic
  // lives with whoever owns the actual data (e.g. AdminUsers.tsx).
  onChange: (key: string) => void;
}

export interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyLabel?: string;
  // All three optional and independent -- a Table with none of them is
  // just a plain resizable grid of rows.
  search?: TableSearchProps;
  sort?: TableSortProps;
  pagination?: TablePaginationProps;
}

// Presentational only -- this component never fetches anything. search/
// sort/pagination are controlled: the caller owns the actual state (and,
// for a server-paginated table like AdminUsers, the actual trpc query),
// Table just renders it and reports interactions upward. Same
// presentational/data-wiring split this repo already uses for
// MarkdownEditor/MarkdownViewer, BrandLockup, ColorSchemeToggleButton.
export function Table<T>({ columns, rows, rowKey, loading, emptyLabel = "Nothing here yet.", search, sort, pagination }: TableProps<T>) {
  // Only resized columns get an entry -- an absent key means "still flex
  // (minmax(minWidth, 1fr))," the starting state for every column.
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const headerCellRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const gridTemplateColumns = useMemo(
    () =>
      columns
        .map((col) => (columnWidths[col.key] ? `${columnWidths[col.key]}px` : `minmax(${col.minWidth ?? DEFAULT_MIN_WIDTH}px, 1fr)`))
        .join(" "),
    [columns, columnWidths],
  );

  function startResize(event: ReactPointerEvent<HTMLDivElement>, column: TableColumn<T>) {
    event.preventDefault();
    const cell = headerCellRefs.current[column.key];
    const startWidth = columnWidths[column.key] ?? cell?.getBoundingClientRect().width ?? column.minWidth ?? DEFAULT_MIN_WIDTH;
    const startX = event.clientX;
    const minWidth = column.minWidth ?? DEFAULT_MIN_WIDTH;
    const pointerId = event.pointerId;
    const target = event.currentTarget;
    target.setPointerCapture(pointerId);

    function handleMove(moveEvent: PointerEvent) {
      const nextWidth = Math.max(minWidth, startWidth + (moveEvent.clientX - startX));
      setColumnWidths((prev) => ({ ...prev, [column.key]: nextWidth }));
    }
    function handleUp() {
      target.releasePointerCapture(pointerId);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  return (
    <div className={styles.wrap}>
      {search && (
        <TextInput
          className={styles.search}
          value={search.value}
          onChange={(event) => search.onChange(event.currentTarget.value)}
          placeholder={search.placeholder ?? "Search"}
          leftSection={<IconSearch size={16} stroke={1.75} />}
          aria-label={search.placeholder ?? "Search"}
        />
      )}

      <div role="table" className={styles.grid} style={{ gridTemplateColumns }}>
        <div role="row" className={styles.headerRowContents}>
          {columns.map((column) => {
            const isActiveSort = sort?.activeKey === column.key;
            return (
              <div
                key={column.key}
                role="columnheader"
                ref={(node) => {
                  headerCellRefs.current[column.key] = node;
                }}
                className={styles.headerCell}
              >
                {column.enableSort ? (
                  <button
                    type="button"
                    className={styles.headerSortButton}
                    onClick={() => sort?.onChange(column.key)}
                  >
                    <span>{column.header}</span>
                    {isActiveSort ? (
                      sort?.direction === "desc" ? (
                        <IconChevronDown size={14} stroke={2} />
                      ) : (
                        <IconChevronUp size={14} stroke={2} />
                      )
                    ) : (
                      <IconArrowsSort size={14} stroke={1.75} className={styles.headerSortHint} />
                    )}
                  </button>
                ) : (
                  <span className={styles.headerLabel}>{column.header}</span>
                )}
                <div className={styles.resizeHandle} onPointerDown={(event) => startResize(event, column)} />
              </div>
            );
          })}
        </div>

        {!loading && rows.length === 0 ? (
          <div className={styles.empty} style={{ gridColumn: `1 / span ${columns.length}` }}>
            {emptyLabel}
          </div>
        ) : (
          rows.map((row) => (
            <div role="row" className={styles.bodyRowContents} key={rowKey(row)}>
              {columns.map((column) => (
                <div key={column.key} role="cell" className={styles.bodyCell}>
                  {column.render(row)}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {pagination && <PaginationBar {...pagination} />}
    </div>
  );
}

function getPageNumbers(current: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, 2, totalPages - 1, totalPages, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1]! > 1) result.push("ellipsis");
    result.push(page);
  });
  return result;
}

function PaginationBar({ page, pageSize, total, pageSizeOptions = [10, 25, 50], onPageChange, onPageSizeChange }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className={styles.paginationBar}>
      <span className={styles.paginationSummary}>
        Showing {start}–{end} of {total}
      </span>
      <div className={styles.paginationControls}>
        <button type="button" className={styles.pageButton} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          ‹ Prev
        </button>
        {getPageNumbers(page, totalPages).map((entry, i) =>
          entry === "ellipsis" ? (
            <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              className={`${styles.pageButton} ${entry === page ? styles.pageButtonActive : ""}`}
              onClick={() => onPageChange(entry)}
            >
              {entry}
            </button>
          ),
        )}
        <button
          type="button"
          className={styles.pageButton}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next ›
        </button>
        <Select
          className={styles.pageSizeSelect}
          aria-label="Rows per page"
          value={String(pageSize)}
          onChange={(value) => value && onPageSizeChange(Number(value))}
          data={pageSizeOptions.map((size) => ({ value: String(size), label: `${size} / page` }))}
          allowDeselect={false}
        />
      </div>
    </div>
  );
}
