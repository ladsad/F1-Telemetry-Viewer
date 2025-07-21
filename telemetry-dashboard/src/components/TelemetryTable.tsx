"use client"

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useTelemetry } from "@/context/TelemetryDataContext";
import { Loader2 } from "lucide-react";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import { TelemetryTableProps } from "@/types";

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
  
  // Use provided data or fall back to context data
  const data = providedData || telemetryState.telemetryHistory || [];
  
  // Sort the data
  const sortedData = [...data].sort((a, b) => {
    if (a[sortField] < b[sortField]) return sortDirection === 'asc' ? -1 : 1;
    if (a[sortField] > b[sortField]) return sortDirection === 'asc' ? 1 : -1;
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
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{title}</CardTitle>
        {showConnectionStatus && <ConnectionStatusIndicator service="telemetry" size="sm" />}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
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
                          className={`grid grid-cols-6 text-sm p-2 ${
                            index % 2 === 0 ? 'bg-muted/30' : ''
                          }`}
                          style={style}
                        >
                          <div>{formatTimestamp(item.timestamp)}</div>
                          <div>{item.speed.toFixed(1)} km/h</div>
                          <div>{item.throttle.toFixed(0)}%</div>
                          <div>{item.brake.toFixed(0)}%</div>
                          <div>{item.gear}</div>
                          <div>{item.rpm.toFixed(0)}</div>
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
          {data.length} records • Sorted by {sortField} ({sortDirection})
        </div>
      </CardContent>
    </Card>
  );
}