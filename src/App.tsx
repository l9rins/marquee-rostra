import './App.css'
import RosterDashboard from './components/RosterDashboard'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

function App() {
  return (
    <TooltipProvider>
      <RosterDashboard />
      <Toaster richColors position="bottom-right" />
    </TooltipProvider>
  )
}

export default App
