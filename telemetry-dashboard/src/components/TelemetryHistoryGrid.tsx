"use client"

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { VariableSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useTelemetry } from "@/context/TelemetryDataContext";
import { Loader2, Download } from "lucide-react";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import AnimatedButton from "@/components/AnimatedButton";

type TelemetryHistoryGridProps = {
  sessionKey?: string;
  maxHeight?: number;
  title?: string;
};

export default function TelemetryHistoryGrid({ 
  sessionKey = 'latest',
  maxHeight = 500,
  title = "Telemetry History",
}: TelemetryHistoryGridProps) {
  const { telemetryState } = useTelemetry();
  const [telemetryData, setTelemetryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchTelemetryHistory() {
      try {
        // In a real implementation, you would fetch from your API
        const res = await fetch(`/api/telemetry/history?session=${sessionKey}`);
        if (res.ok) {
          const data = await res.json();
          setTelemetryData(data);
        }
      } catch (error) {
        console.error("Failed to fetch telemetry history:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTelemetryHistory();
    
    // Or use context data if available
    if (telemetryState.telemetryHistory) {
      setTelemetryData(telemetryState.telemetryHistory);
      setLoading(false);
    }
  }, [sessionKey, telemetryState.telemetryHistory]);
  
  const columns = [
    { key: 'timestamp', width: 180, label: 'Time' },
    { key: 'speed', width: 100, label: 'Speed (km/h)' },
    { key: 'throttle', width: 100, label: 'Throttle (%)' },
    { key: 'brake', width: 100, label: 'Brake (%)' },
    { key: 'gear', width: 80, label: 'Gear' },
    { key: 'rpm', width: 100, label: 'RPM' },
    { key: 'drs', width: 80, label: 'DRS' },
  ];
  
  // Format data for display
  const formatCellData = (key: string, value: any) => {
    if (key === 'timestamp') {
      return new Date(value).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
      });
    }
    
    if (key === 'speed' || key === 'rpm') {
      return value.toFixed(1);
    }
    
    if (key === 'throttle' || key === 'brake') {
      return value.toFixed(0) + '%';
    }
    
    if (key === 'drs') {
      return value ? 'ON' : 'OFF';
    }
    
    return value;
  };
  
  // Export data as CSV
  const exportCSV = () => {
    if (!telemetryData.length) return;
    
    const headers = columns.map(c => c.label).join(',');
    const rows = telemetryData.map(item => 
      columns.map(col => formatCellData(col.key, item[col.key])).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `telemetry_${sessionKey}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-2">
          <ConnectionStatusIndicator service="telemetry" size="sm" />
          <AnimatedButton
            variant="ghost"
            size="sm"
            onClick={exportCSV}
            disabled={loading || !telemetryData.length}
          >
            <Download className="w-4 h-4 mr-1" />
            <span className="text-sm">Export</span>
          </AnimatedButton>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-48 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span className="text-sm text-muted-foreground">Loading telemetry history...</span>
          </div>
        ) : telemetryData.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <span className="text-sm text-muted-foreground">No telemetry history available</span>
          </div>
        ) : (
          <div className="border rounded">
            {/* Header */}
            <div className="flex bg-muted p-2 text-xs font-medium">
              {columns.map((column) => (
                <div
                  key={column.key}
                  className="truncate"
                  style={{ width: column.width }}
                >
                  {column.label}
                </div>
              ))}
            </div>
            
            {/* Virtualized Grid */}
            <div style={{ height: maxHeight }}>
              <AutoSizer>
                {({ height, width }) => (
                  <Grid
                    className="virtualized-grid"
                    columnCount={columns.length}
                    columnWidth={(index) => columns[index].width}
                    height={height}
                    rowCount={telemetryData.length}
                    rowHeight={() => 30}
                    width={width}
                  >
                    {({ columnIndex, rowIndex, style }) => (
                      <div
                        className={`flex items-center px-2 truncate text-sm ${
                          rowIndex % 2 === 0 ? 'bg-muted/30' : ''
                        }`}
                        style={{
                          ...style,
                          fontWeight: columnIndex === 0 ? 500 : 400,
                          color: 
                            columns[columnIndex].key === 'drs' && telemetryData[rowIndex].drs 
                              ? 'rgb(34, 197, 94)' // green for active DRS
                              : 'inherit'
                        }}
                      >
                        {formatCellData(
                          columns[columnIndex].key,
                          telemetryData[rowIndex][columns[columnIndex].key]
                        )}
                      </div>
                    )}
                  </Grid>
                )}
              </AutoSizer>
            </div>
            <div className="p-2 text-xs text-muted-foreground">
              {telemetryData.length} records
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}