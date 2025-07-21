declare module 'react-window' {
  import * as React from 'react';

  // List Types
  export interface ListChildComponentProps {
    index: number;
    style: React.CSSProperties;
    data?: any;
    isScrolling?: boolean;
  }

  export interface ListProps {
    children: (props: ListChildComponentProps) => React.ReactNode;
    className?: string;
    height: number;
    width: number;
    itemCount: number;
    itemSize: number | ((index: number) => number);
    itemData?: any;
    layout?: 'horizontal' | 'vertical';
    overscanCount?: number;
    useIsScrolling?: boolean;
    onItemsRendered?: (props: {
      overscanStartIndex: number;
      overscanStopIndex: number;
      visibleStartIndex: number;
      visibleStopIndex: number;
    }) => void;
    onScroll?: (props: {
      scrollDirection: 'forward' | 'backward';
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => void;
    itemKey?: (index: number, data: any) => string | number;
    style?: React.CSSProperties;
  }

  export class FixedSizeList extends React.Component<ListProps> {}
  
  // Grid Types
  export interface GridChildComponentProps {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
    data?: any;
    isScrolling?: boolean;
  }

  export interface GridProps {
    children: (props: GridChildComponentProps) => React.ReactNode;
    className?: string;
    columnCount: number;
    columnWidth: number | ((index: number) => number);
    height: number;
    width: number;
    rowCount: number;
    rowHeight: number | ((index: number) => number);
    itemData?: any;
    overscanColumnCount?: number;
    overscanRowCount?: number;
    useIsScrolling?: boolean;
    onItemsRendered?: (props: {
      overscanColumnStartIndex: number;
      overscanColumnStopIndex: number;
      overscanRowStartIndex: number;
      overscanRowStopIndex: number;
      visibleColumnStartIndex: number;
      visibleColumnStopIndex: number;
      visibleRowStartIndex: number;
      visibleRowStopIndex: number;
    }) => void;
    onScroll?: (props: {
      horizontalScrollDirection: 'forward' | 'backward';
      scrollLeft: number;
      scrollTop: number;
      scrollUpdateWasRequested: boolean;
      verticalScrollDirection: 'forward' | 'backward';
    }) => void;
    itemKey?: (props: { columnIndex: number; rowIndex: number; data: any }) => string | number;
    style?: React.CSSProperties;
  }

  export class FixedSizeGrid extends React.Component<GridProps> {}
  
  export class VariableSizeGrid extends React.Component<GridProps> {}

  export class VariableSizeList extends React.Component<ListProps> {}

  // Other exports
  export type ScrollToAlign = 'auto' | 'smart' | 'center' | 'start' | 'end';

  export interface ListRef {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: ScrollToAlign): void;
  }

  export interface GridRef {
    scrollTo({ scrollLeft, scrollTop }: { scrollLeft: number; scrollTop: number }): void;
    scrollToItem({
      align,
      columnIndex,
      rowIndex,
    }: {
      align?: ScrollToAlign;
      columnIndex?: number;
      rowIndex?: number;
    }): void;
  }
}