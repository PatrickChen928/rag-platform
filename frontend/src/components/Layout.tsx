import { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BookOutlined,
  MessageOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import './Layout.css'

interface LayoutProps {
  children: ReactNode
}

const navItems = [
  { path: '/knowledge', icon: <BookOutlined />, label: '知识库' },
  { path: '/chat', icon: <MessageOutlined />, label: '对话' },
  { path: '/settings', icon: <SettingOutlined />, label: '设置' },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">
            <span className="logo-letter">K</span>
          </div>
          <span className="logo-text">知识库</span>
        </div>

        <nav className="nav-menu">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              <span className="nav-indicator" />
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="version">v1.0.0</div>
        </div>
      </aside>

      <main className="main-content">
        <div className="content-wrapper">
          {children}
        </div>
        <div className="grain-overlay" />
      </main>
    </div>
  )
}
