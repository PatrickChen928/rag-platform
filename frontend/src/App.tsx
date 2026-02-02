import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import KnowledgeList from './pages/KnowledgeList'
import KnowledgeDetail from './pages/KnowledgeDetail'
import Chat from './pages/Chat'
import Settings from './pages/Settings'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/knowledge" replace />} />
        <Route path="/knowledge" element={<KnowledgeList />} />
        <Route path="/knowledge/:id" element={<KnowledgeDetail />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default App
