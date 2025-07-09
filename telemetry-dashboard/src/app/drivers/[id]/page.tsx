import { useParams } from "next/navigation"

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Driver Details</h1>
      <div>Driver ID: {id}</div>
      {/* Render driver-specific info here */}
    </div>
  )
}