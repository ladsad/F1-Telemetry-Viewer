"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { useTelemetry } from "@/context/TelemetryDataContext";
import { Loader2, ArrowUpDown, Download, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import { TelemetryTableProps, TelemetryData } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { useTelemetryVirtualization } from "@/lib/hooks/useTelemetryVirtualization";
import type { ListChildComponentProps, VariableSizeList as VariableSizeListType, FixedSizeList as FixedSizeListType } from "react-window";

// Enhanced column configuration with flexible widths
interface ColumnConfig {
  key: keyof TelemetryData;
  label: string;
  width: number;
  minWidth: number;
  sortable: boolean;
  formatter?: (value: any) => string;
  alignment?: 'left' | 'center' | 'right';
  sticky?: boolean;
}

// Row height calculator for variable-size virtualization
const calculateRowHeight = (index: number, data: TelemetryData[]): number => {
  const item = data[index];
  if (!item) return 40; // Default height
  
  // Calculate dynamic height based on content
  let baseHeight = 40;
  
  // Add height for long values or special formatting
  if (item.timestamp && String(item.timestamp).length > 15) baseHeight += 5;
  if (item.speed && item.speed > 300) baseHeight += 5; // High speed values
  
  return Math.max(baseHeight, 35); // Minimum height
};

// Enhanced filtering options
interface FilterOptions {
  searchTerm: string;
  speedRange: { min: number; max: number };
  gearFilter: number | 'all';
  timeRange: { start: Date | null; end: Date | null };
  drsOnly: boolean;
}

// Memoized row renderer for performance
const VirtualizedRow = useCallback(({ 
  index, 
  style, 
  data 
}: ListChildComponentProps) => {
  const { items, columns, onRowClick, selectedRows } = data as { 
    items: TelemetryData[], 
    columns: ColumnConfig[], 
    onRowClick?: (item: TelemetryData, index: number) => void,
    selectedRows?: Set<number>
  };
  
  const item = items[index];
  const isSelected = selectedRows?.has(index);
  const isEven = index % 2 === 0;

  if (!item) return null;

  return (
    <motion.div
      style={style}
      className={`
        flex border-b border-border/30 transition-colors duration-150
        ${isEven ? 'bg-muted/20' : 'bg-background'}
        ${isSelected ? 'bg-primary/10 border-primary/30' : ''}
        ${onRowClick ? 'cursor-pointer hover:bg-muted/40' : ''}
      `}
      onClick={() => onRowClick?.(item, index)}
      whileHover={{ backgroundColor: 'rgba(var(--primary), 0.05)' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.01 }}
    >
      {columns.map((column: ColumnConfig) => {
        const value = item[column.key];
        const formattedValue = column.formatter ? column.formatter(value) : String(value || 'N/A');
        
        return (
          <div
            key={column.key}
            className={`
              flex items-center px-3 py-2 text-sm truncate
              ${column.alignment === 'center' ? 'justify-center' : ''}
              ${column.alignment === 'right' ? 'justify-end' : ''}
              ${column.sticky ? 'sticky left-0 bg-inherit z-10' : ''}
            `}
            style={{ 
              width: column.width,
              minWidth: column.minWidth
            }}
            title={formattedValue}
          >
            <span className="truncate">{formattedValue}</span>
          </div>
        );
      })}
    </motion.div>
  );
}, []);

// Header component with sorting
const TableHeader = ({ 
  columns, 
  sortField, 
  sortDirection, 
  onSort,
  totalWidth 
}: {
  columns: ColumnConfig[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  totalWidth: number;
}) => (
  <div 
    className="flex bg-muted/50 border-b-2 border-border sticky top-0 z-20"
    style={{ width: totalWidth }}
  >
    {columns.map((column) => (
      <div
        key={column.key}
        className={`
          flex items-center px-3 py-3 text-xs font-medium uppercase tracking-wider
          ${column.sortable ? 'cursor-pointer hover:bg-muted/70 transition-colors' : ''}
          ${column.alignment === 'center' ? 'justify-center' : ''}
          ${column.alignment === 'right' ? 'justify-end' : ''}
          ${column.sticky ? 'sticky left-0 bg-muted/50 z-10' : ''}
        `}
        style={{ 
          width: column.width,
          minWidth: column.minWidth
        }}
        onClick={() => column.sortable && onSort(column.key)}
      >
        <span className="truncate">{column.label}</span>
        {column.sortable && (
          <div className="ml-1 flex flex-col">
            {sortField === column.key ? (
              <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30" />
            )}
          </div>
        )}
      </div>
    ))}
  </div>
);

// Lazy load virtualization components
const VariableSizeList = dynamic(() => 
  import("react-window").then(mod => ({ default: mod.VariableSizeList })), 
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-muted animate-pulse rounded" />
  }
)

const FixedSizeList = dynamic(() => 
  import("react-window").then(mod => ({ default: mod.FixedSizeList })), 
  { 
    ssr: false,
    loading: () => <div className="w-full h-64 bg-muted animate-pulse rounded" />
  }
)

const AutoSizer = dynamic(() => import("react-virtualized-auto-sizer"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted animate-pulse rounded" />
})

// Main component with enhanced virtualization
export default function TelemetryTable({
  data: providedData,
  title = "Telemetry Data",
  maxHeight = 600,
  showConnectionStatus = true,
  virtualScrollOptions = { 
    itemSize: 40, 
    overscanCount: 10,
    useVariableSize: true,
    enableSelection: false,
    enableFiltering: true
  }
}: TelemetryTableProps & {
  virtualScrollOptions?: {
    itemSize: number;
    overscanCount: number;
    useVariableSize?: boolean;
    enableSelection?: boolean;
    enableFiltering?: boolean;
  }
}) {
  const { telemetryState, connectionStatus } = useTelemetry();
  const [sortField, setSortField] = useState<string>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    speedRange: { min: 0, max: 400 },
    gearFilter: 'all',
    timeRange: { start: null, end: null },
    drsOnly: false
  });
  
  // Refs for virtualization - use a more flexible type
  const listRef = useRef<any>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Column configuration with enhanced formatting
  const columns: ColumnConfig[] = useMemo(() => [
    {
      key: 'timestamp',
      label: 'Time',
      width: 180,
      minWidth: 150,
      sortable: true,
      sticky: true,
      formatter: (value: number | string | undefined) => {
        if (!value) return 'N/A';
        const date = typeof value === 'number' ? new Date(value) : new Date(value);
        if (isNaN(date.getTime())) return 'Invalid';
        return date.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          fractionalSecondDigits: 3 
        });
      }
    },
    {
      key: 'speed',
      label: 'Speed',
      width: 100,
      minWidth: 80,
      sortable: true,
      alignment: 'right',
      formatter: (value: number) => value?.toFixed(1) + ' km/h' || 'N/A'
    },
    {
      key: 'throttle',
      label: 'Throttle',
      width: 90,
      minWidth: 70,
      sortable: true,
      alignment: 'right',
      formatter: (value: number) => value?.toFixed(0) + '%' || 'N/A'
    },
    {
      key: 'brake',
      label: 'Brake',
      width: 80,
      minWidth: 60,
      sortable: true,
      alignment: 'right',
      formatter: (value: number) => value?.toFixed(0) + '%' || 'N/A'
    },
    {
      key: 'gear',
      label: 'Gear',
      width: 70,
      minWidth: 50,
      sortable: true,
      alignment: 'center',
      formatter: (value: number) => value !== undefined ? String(value) : 'N/A'
    },
    {
      key: 'rpm',
      label: 'RPM',
      width: 100,
      minWidth: 80,
      sortable: true,
      alignment: 'right',
      formatter: (value: number) => value?.toLocaleString() || 'N/A'
    },
    {
      key: 'drs',
      label: 'DRS',
      width: 60,
      minWidth: 50,
      sortable: true,
      alignment: 'center',
      formatter: (value: boolean) => value ? '✓' : '✗'
    }
  ], []);

  // Calculate total width for horizontal scrolling
  const totalWidth = useMemo(() => 
    columns.reduce((sum, col) => sum + col.width, 0), 
    [columns]
  );

  // Get and process raw data
  const rawData = providedData || telemetryState.telemetryHistory?.indexedData || [];
  const dataArray: TelemetryData[] = useMemo(() => {
    if (Array.isArray(rawData)) {
      return rawData;
    }
    if (
      rawData &&
      typeof rawData === 'object' &&
      'data' in rawData &&
      Array.isArray((rawData as { data?: unknown }).data)
    ) {
      return (rawData as { data: TelemetryData[] }).data;
    }
    return [];
  }, [rawData]);

  // Apply filters
  const filteredData = useMemo(() => {
    let result = [...dataArray];

    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      result = result.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchLower)
        )
      );
    }

    // Speed range filter
    result = result.filter(item => 
      item.speed >= filters.speedRange.min && 
      item.speed <= filters.speedRange.max
    );

    // Gear filter
    if (filters.gearFilter !== 'all') {
      result = result.filter(item => item.gear === filters.gearFilter);
    }

    // DRS filter
    if (filters.drsOnly) {
      result = result.filter(item => item.drs);
    }

    // Time range filter
    if (filters.timeRange.start && filters.timeRange.end) {
      const startTime = filters.timeRange.start.getTime();
      const endTime = filters.timeRange.end.getTime();
      result = result.filter(item => {
        const itemTime = typeof item.timestamp === 'number' 
          ? item.timestamp 
          : new Date(item.timestamp || 0).getTime();
        return itemTime >= startTime && itemTime <= endTime;
      });
    }

    return result;
  }, [dataArray, filters]);

  // Apply sorting
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortField as keyof TelemetryData];
      const bValue = b[sortField as keyof TelemetryData];

      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bValue === undefined) return sortDirection === 'asc' ? -1 : 1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue);
      const bStr = String(bValue);
      return sortDirection === 'asc' 
        ? aStr.localeCompare(bStr) 
        : bStr.localeCompare(aStr);
    });
  }, [filteredData, sortField, sortDirection]);

  // Use virtualization hook for large datasets
  const { processedData, isProcessing } = useTelemetryVirtualization(sortedData, {
    batchSize: 200,
    throttleMs: 16
  });

  // Handle sorting
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Handle row selection
  const handleRowClick = useCallback((item: TelemetryData, index: number) => {
    if (!virtualScrollOptions?.enableSelection) return;
    
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, [virtualScrollOptions?.enableSelection]);

  // Export selected data
  const exportData = useCallback(() => {
    const dataToExport = selectedRows.size > 0 
      ? processedData.filter((_, index) => selectedRows.has(index))
      : processedData;
    
    const csvContent = [
      columns.map(col => col.label).join(','),
      ...dataToExport.map(item => 
        columns.map(col => {
          const value = item[col.key];
          const formatted = col.formatter ? col.formatter(value) : String(value || '');
          return `"${formatted.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [processedData, selectedRows, columns]);

  // Scroll to specific row
  const scrollToRow = useCallback((index: number) => {
    if (listRef.current) {
      if ('scrollToItem' in listRef.current) {
        listRef.current.scrollToItem(index, 'center');
      } else {
        // Fallback for lists that don't support scrollToItem
        console.warn('scrollToItem not supported by this list type');
      }
    }
  }, []);

  // Item data for virtualization
  const itemData = useMemo(() => ({
    items: processedData,
    columns,
    onRowClick: handleRowClick,
    selectedRows
  }), [processedData, columns, handleRowClick, selectedRows]);

  // Row height getter for variable-size list
  const getItemSize = useCallback((index: number) => {
    return virtualScrollOptions?.useVariableSize 
      ? calculateRowHeight(index, processedData)
      : virtualScrollOptions?.itemSize || 40;
  }, [processedData, virtualScrollOptions]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {showConnectionStatus && (
              <ConnectionStatusIndicator service="telemetry" size="sm" />
            )}
            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {processedData.length.toLocaleString()} records
              {selectedRows.size > 0 && ` (${selectedRows.size} selected)`}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
              disabled={processedData.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {virtualScrollOptions?.enableFiltering && (
          <AnimatePresence>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3"
            >
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search all fields..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))
                  }
                  className="pl-8"
                />
              </div>

              <Select
                value={filters.gearFilter === 'all' ? 'all' : String(filters.gearFilter)}
                onValueChange={(value) => setFilters(prev => ({
                  ...prev,
                  gearFilter: value === 'all' ? 'all' : Number(value)
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by gear" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Gears</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(gear => (
                    <SelectItem key={gear} value={String(gear)}>Gear {gear}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Speed:</label>
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.speedRange.min}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    speedRange: { ...prev.speedRange, min: Number(e.target.value) }
                  }))}
                  className="w-20"
                />
                <span>-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.speedRange.max}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    speedRange: { ...prev.speedRange, max: Number(e.target.value) }
                  }))}
                  className="w-20"
                />
              </div>

              <Button
                variant={filters.drsOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, drsOnly: !prev.drsOnly }))
                }
              >
                <Filter className="w-4 h-4 mr-1" />
                DRS Only
              </Button>
            </motion.div>
          </AnimatePresence>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        {processedData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            {connectionStatus?.telemetry === 'connecting' ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span>Loading telemetry data...</span>
              </>
            ) : (
              <>
                <Filter className="w-8 h-8 mb-2" />
                <span>No telemetry data available</span>
                {filters.searchTerm && (
                  <span className="text-sm mt-1">
                    Try adjusting your search or filters
                  </span>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <TableHeader
              columns={columns}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              totalWidth={totalWidth}
            />

            <div className="flex-1 overflow-hidden">
              <AutoSizer>
                {({ height, width }) => {
                  const ListComponent = virtualScrollOptions?.useVariableSize ? VariableSizeList : FixedSizeList;
                  
                  const listProps = {
                    ref: listRef,
                    height,
                    width,
                    itemCount: processedData.length,
                    itemData: itemData,
                    overscanCount: virtualScrollOptions?.overscanCount || 10,
                    className: "virtualized-table-list",
                    children: VirtualizedRow
                  };

                  if (virtualScrollOptions?.useVariableSize) {
                    return (
                      <VariableSizeList
                        {...listProps}
                        itemSize={getItemSize}
                      />
                    );
                  } else {
                    return (
                      <FixedSizeList
                        {...listProps}
                        itemSize={virtualScrollOptions?.itemSize || 40}
                      />
                    );
                  }
                }}
              </AutoSizer>
            </div>
          </div>
        )}

        <div className="border-t bg-muted/30 px-4 py-2 flex justify-between items-center text-xs text-muted-foreground">
          <span>
            Showing {processedData.length.toLocaleString()} of {dataArray.length.toLocaleString()} records
            • Sorted by {columns.find(col => col.key === sortField)?.label} ({sortDirection})
          </span>
          {selectedRows.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRows(new Set())}
              className="text-xs"
            >
              Clear Selection ({selectedRows.size})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}