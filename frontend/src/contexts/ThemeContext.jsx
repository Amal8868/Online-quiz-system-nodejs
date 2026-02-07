import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * THE THEME CONTEXT: Our Global Style Switch.
 * 
 * In React, "Context" is like a Global Announcement system. 
 * Instead of passing the "Dark Mode" setting from component to component like a 
 * game of telephone, we announce it once here, and any component can "listen" to it.
 */
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    // MEMORY CHECK: Did the user pick a theme last time they were here?
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('quizTheme');
      if (savedTheme === 'dark') return true;
      if (savedTheme === 'light') return false;

      // If they never picked one, we check if their computer is set to Dark Mode.
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // MAGIC TRICK: Every time 'darkMode' changes, we update the HTML tag 
  // and save the choice in the browser's memory.
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('quizTheme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('quizTheme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return (
    // We "Provide" the theme status and the toggle function to the rest of the app.
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// HELPER HOOK: This is a shortcut for other components to get the theme data.
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
