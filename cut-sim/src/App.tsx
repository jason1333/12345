import { Link, Route, Routes } from 'react-router-dom'
import './App.css'
import Cutting from './pages/Cutting'

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Cutting />} />
        <Route
          path="*"
          element={
            <div style={{ padding: 16 }}>
              <div>Not found.</div>
              <Link to="/">Go to Cutting</Link>
            </div>
          }
        />
      </Routes>
    </div>
  )
}

export default App
