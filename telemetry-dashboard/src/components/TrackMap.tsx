import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TrackMapPlaceholder() {
  // Example driver positions (normalized 0-1)
  const drivers = [
    { id: 1, name: "VER", x: 0.2, y: 0.7, color: "#2563eb" },
    { id: 2, name: "HAM", x: 0.5, y: 0.3, color: "#16a34a" },
    { id: 3, name: "LEC", x: 0.8, y: 0.6, color: "#dc2626" },
  ]

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Track Map (Placeholder)</CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox="0 0 300 200"
          width="100%"
          height="180"
          style={{ background: "#18181b", borderRadius: 12 }}
        >
          {/* Simple track outline */}
          <path
            d="M40,160 Q60,40 150,40 Q240,40 260,160 Q150,180 40,160 Z"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={4}
          />
          {/* Driver markers */}
          {drivers.map((driver) => (
            <g key={driver.id}>
              <circle
                cx={40 + driver.x * 220}
                cy={160 - driver.y * 120}
                r={10}
                fill={driver.color}
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                x={40 + driver.x * 220}
                y={160 - driver.y * 120 + 4}
                textAnchor="middle"
                fontSize="10"
                fill="#fff"
                fontWeight="bold"
              >
                {driver.name}
              </text>
            </g>
          ))}
        </svg>
      </CardContent>
    </Card>
  )
}