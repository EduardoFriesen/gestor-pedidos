import React, { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Menu from './pages/Menu'
import Clients from './pages/Clients'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('piu-theme') || 'claro')
  const [macroMode, setMacroMode] = useState(() => localStorage.getItem('piu-macro') === 'true')

  useEffect(() => {
    document.documentElement.className = `theme-${theme}${macroMode ? ' macro-mode' : ''}`
    localStorage.setItem('piu-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.classList.toggle('macro-mode', macroMode)
    localStorage.setItem('piu-macro', macroMode)
  }, [macroMode])

  return (
    <Layout theme={theme} setTheme={setTheme} macroMode={macroMode} setMacroMode={setMacroMode}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} macroMode={macroMode} setMacroMode={setMacroMode} />} />
      </Routes>
    </Layout>
  )
}
