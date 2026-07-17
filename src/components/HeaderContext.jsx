import React, { createContext, useContext, useState } from 'react'

const HeaderContext = createContext()

export function HeaderProvider({ children }) {
  const [headerContent, setHeaderContent] = useState(null)
  return (
    <HeaderContext.Provider value={{ headerContent, setHeaderContent }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeaderContent() {
  return useContext(HeaderContext)
}
