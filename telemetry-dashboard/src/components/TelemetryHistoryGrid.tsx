"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TelemetryHistoryGridProps {
  sessionKey: string;
}

export default function TelemetryHistoryGrid({ sessionKey }: TelemetryHistoryGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Telemetry History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Telemetry history for session: {sessionKey}</p>
        </div>
      </CardContent>
    </Card>
  );
}