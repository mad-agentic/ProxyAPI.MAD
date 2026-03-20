import { BrowserRouter, Routes, Route } from "react-router-dom"
import { MainLayout } from "./layouts/MainLayout"
import { Dashboard } from "./pages/Dashboard"
import { ApiKeys } from "./pages/ApiKeys"
import { Providers } from "./pages/Providers"
import { Chat } from "./pages/Chat"
import { Logs } from "./pages/Logs"
import { Settings } from "./pages/Settings"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          {/* Routes for other pages will go here */}
          <Route path="/keys" element={<ApiKeys />} />
          <Route path="/providers" element={<Providers />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
