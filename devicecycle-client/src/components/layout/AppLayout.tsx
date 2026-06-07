import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0c0c14] flex-col md:flex-row">
      <div className="flex flex-1 min-w-0 overflow-hidden flex-row">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
            <div className="max-w-7xl mx-auto animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
