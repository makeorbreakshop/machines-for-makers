export function ProductDiscoveryContent() {
  // Just render an iframe to the existing discovery page
  return (
    <iframe 
      src="/admin/discovery" 
      className="w-full h-[800px] border-0"
      title="Product Discovery"
    />
  )
}