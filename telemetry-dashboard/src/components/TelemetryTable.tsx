"use client"

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useTelemetry } from "@/context/TelemetryDataContext";
import { Loader2 } from "lucide-react";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import { TelemetryTableProps, TelemetryData } from "@/types";

export default function TelemetryTable({ 
  data: providedData,
  title = "Telemetry Data",
  maxHeight = 400,
  showConnectionStatus = true,
  virtualScrollOptions = { itemSize: 36, overscanCount: 5 }
}: TelemetryTableProps) {
  const { telemetryState, connectionStatus } = useTelemetry();
  const [sortField, setSortField] = useState<string>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Get raw data from props or context
  const rawData = providedData || telemetryState.telemetryHistory || [];
  
  // Convert to array - handle both direct array and TelemetryTimeSeriesData
  const dataArray: TelemetryData[] = Array.isArray(rawData) 
    ? rawData 
    : (rawData && typeof rawData === 'object' && 'data' in rawData && Array.isArray(rawData.data))
      ? rawData.data // Extract from TelemetryTimeSeriesData.data
      : []; // Fallback to empty array
  
  // Sort the data with proper type checking
  const sortedData = [...dataArray].sort((a: TelemetryData, b: TelemetryData) => {
    const aValue = a[sortField as keyof TelemetryData];
    const bValue = b[sortField as keyof TelemetryData];
    
    // Handle undefined values
    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return sortDirection === 'asc' ? 1 : -1;
    if (bValue === undefined) return sortDirection === 'asc' ? -1 : 1;
    
    // Compare values
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle sort click
  const handleSortClick = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Define column config
  const columns = [
    { key: 'timestamp', label: 'Time', width: '20%' },
    { key: 'speed', label: 'Speed', width: '15%' },
    { key: 'throttle', label: 'Throttle', width: '15%' },
    { key: 'brake', label: 'Brake', width: '15%' },
    { key: 'gear', label: 'Gear', width: '15%' },
    { key: 'rpm', label: 'RPM', width: '20%' },
  ];

  // Function to format timestamp
  const formatTimestamp = (timestamp: number | string | undefined): string => {
    if (timestamp === undefined || timestamp === null) return 'N/A';
    
    // Handle both number (Unix timestamp) and string (ISO date) formats
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  // Helper function to safely format numeric values
  const formatNumericValue = (value: number | undefined, decimals: number = 1, unit: string = ''): string => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return `${value.toFixed(decimals)}${unit}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{title}</CardTitle>
        {showConnectionStatus && <ConnectionStatusIndicator service="telemetry" size="sm" />}
      </CardHeader>
      <CardContent>
        {dataArray.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
            {connectionStatus?.telemetry === 'connecting' ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span>Loading telemetry data...</span>
              </>
            ) : (
              <span>No telemetry data available</span>
            )}
          </div>
        ) : (
          <div className="border rounded">
            {/* Table header */}
            <div className="grid grid-cols-6 bg-muted text-xs font-medium uppercase p-2">
              {columns.map(column => (
                <div 
                  key={column.key} 
                  className="cursor-pointer hover:text-primary"
                  style={{ width: column.width }}
                  onClick={() => handleSortClick(column.key)}
                >
                  {column.label}
                  {sortField === column.key && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              ))}
            </div>
            
            {/* Virtualized table body */}
            <div style={{ height: maxHeight, width: '100%' }}>
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    height={height}
                    itemCount={sortedData.length}
                    itemSize={virtualScrollOptions.itemSize}
                    width={width}
                    overscanCount={virtualScrollOptions.overscanCount}
                  >
                    {({ index, style }) => {
                      const item = sortedData[index];
                      return (
                        <div 
                          className={`grid grid-cols-6 text-sm p-2 border-b border-border/50 ${
                            index % 2 === 0 ? 'bg-muted/30' : ''
                          }`}
                          style={style}
                        >
                          <div className="truncate">{formatTimestamp(item.timestamp)}</div>
                          <div className="truncate">{formatNumericValue(item.speed, 1, ' km/h')}</div>
                          <div className="truncate">{formatNumericValue(item.throttle, 0, '%')}</div>
                          <div className="truncate">{formatNumericValue(item.brake, 0, '%')}</div>
                          <div className="truncate">{item.gear !== undefined ? item.gear : 'N/A'}</div>
                          <div className="truncate">{formatNumericValue(item.rpm, 0)}</div>
                        </div>
                      );
                    }}
                  </List>
                )}
              </AutoSizer>
            </div>
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-2">
          {dataArray.length} records • Sorted by {sortField} ({sortDirection})
        </div>
      </CardContent>
    </Card>
  );
}