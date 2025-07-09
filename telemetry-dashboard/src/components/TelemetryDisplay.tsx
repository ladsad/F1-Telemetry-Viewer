// components/TelemetryDisplay.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, Zap, Activity, Settings, TrendingUp, Circle } from "lucide-react";

type TelemetryData = {
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  drs: boolean;
  rpm: number;
};

const mockData: TelemetryData = {
  speed: 280,
  throttle: 92,
  brake: 8,
  gear: 7,
  drs: true,
  rpm: 12800,
};

export default function TelemetryDisplay({ data = mockData }: { data?: TelemetryData }) {
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Live Telemetry</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center">
          <Gauge className="mb-1" />
          <span className="text-lg font-bold">{data.speed} km/h</span>
          <span className="text-xs text-muted-foreground">Speed</span>
        </div>
        <div className="flex flex-col items-center">
          <Zap className="mb-1" />
          <span className="text-lg font-bold">{data.throttle}%</span>
          <span className="text-xs text-muted-foreground">Throttle</span>
        </div>
        <div className="flex flex-col items-center">
          <Activity className="mb-1" />
          <span className="text-lg font-bold">{data.brake}%</span>
          <span className="text-xs text-muted-foreground">Brake</span>
        </div>
        <div className="flex flex-col items-center">
          <Settings className="mb-1" />
          <span className="text-lg font-bold">{data.gear}</span>
          <span className="text-xs text-muted-foreground">Gear</span>
        </div>
        <div className="flex flex-col items-center">
          <TrendingUp className="mb-1" />
          <span className="text-lg font-bold">{data.rpm}</span>
          <span className="text-xs text-muted-foreground">RPM</span>
        </div>
        <div className="flex flex-col items-center">
          <Circle className={`mb-1 ${data.drs ? "text-green-500" : "text-gray-400"}`} />
          <span className="text-lg font-bold">{data.drs ? "ON" : "OFF"}</span>
          <span className="text-xs text-muted-foreground">DRS</span>
        </div>
      </CardContent>
    </Card>
  );
}
