import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

const ThemeContext =
  createContext()

export function ThemeProvider({
  children,
}) {

  const [darkMode, setDarkMode] =
    useState(false)

  useEffect(() => {

    const savedTheme =
      localStorage.getItem('theme')

    if (savedTheme === 'dark') {

      setDarkMode(true)

      document.documentElement.classList.add(
        'dark'
      )

    } else {

      setDarkMode(false)

      document.documentElement.classList.remove(
        'dark'
      )
    }

  }, [])

  function toggleTheme() {

    const newTheme = !darkMode

    setDarkMode(newTheme)

    if (newTheme) {

      document.documentElement.classList.add(
        'dark'
      )

      localStorage.setItem(
        'theme',
        'dark'
      )

    } else {

      document.documentElement.classList.remove(
        'dark'
      )

      localStorage.setItem(
        'theme',
        'light'
      )
    }
  }

  return (

    <ThemeContext.Provider
      value={{
        darkMode,
        toggleTheme,
      }}
    >

      {children}

    </ThemeContext.Provider>
  )
}

export function useTheme() {

  return useContext(
    ThemeContext
  )
}