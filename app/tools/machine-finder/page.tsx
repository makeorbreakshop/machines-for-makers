import MachineFinderClient from "./MachineFinderClient"

export const metadata = {
  title: "Machine Finder - Find Your Perfect Machine | Machines for Makers",
  description: "Answer a few questions to find the perfect laser cutter, 3D printer, or CNC machine for your needs.",
}

export default function MachineFinder() {
  return <MachineFinderClient />
}

