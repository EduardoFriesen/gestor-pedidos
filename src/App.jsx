import React, { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { HeaderProvider } from './components/HeaderContext'
import ToastProvider from './components/ToastProvider'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Menu from './pages/Menu'
import Clients from './pages/Clients'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Ingredients from './pages/Ingredients'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('piu-theme') || 'claro')
  const [macroMode, setMacroMode] = useState(() => localStorage.getItem('piu-macro') === 'true')
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('piu-font-size') || 'medium')

  useEffect(() => {
    const fontClass = fontSize === 'small' ? 'font-small' : fontSize === 'large' ? 'font-large' : ''
    document.documentElement.className = `theme-${theme}${macroMode ? ' macro-mode' : ''}${fontClass ? ' ' + fontClass : ''}`
    localStorage.setItem('piu-theme', theme)
  }, [theme, macroMode, fontSize])

  useEffect(() => {
    document.documentElement.classList.toggle('macro-mode', macroMode)
    localStorage.setItem('piu-macro', macroMode)
  }, [macroMode])

  return (
    <HeaderProvider>
      <Layout theme={theme} setTheme={setTheme} macroMode={macroMode} setMacroMode={setMacroMode}>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ingredients" element={<Ingredients />} />
            <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} macroMode={macroMode} setMacroMode={setMacroMode} fontSize={fontSize} setFontSize={setFontSize} />} />
          </Routes>
        </ToastProvider>
      </Layout>
    </HeaderProvider>
  )
}
