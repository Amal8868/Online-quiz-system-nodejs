import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${
        darkMode ? 'bg-primary-600' : 'bg-gray-200'
      }`}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span
        className={`
          flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-gray-100 transform transition-transform duration-300
          ${darkMode ? 'translate-x-6' : 'translate-x-0'}
        `}
      >
        {darkMode ? (
          <MoonIcon className="w-4 h-4 text-gray-800" />
        ) : (
          <SunIcon className="w-4 h-4 text-yellow-500" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;
