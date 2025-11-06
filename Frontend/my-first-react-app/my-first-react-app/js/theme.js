// Theme Toggle Functionality

(function() {
  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
  };

  const setTheme = (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    localStorage.setItem('theme', theme);
    updateThemeIcons(theme);
  };

  const updateThemeIcons = (theme) => {
    const moonIcons = document.querySelectorAll('#moon-icon, #moon-icon-mobile');
    const sunIcons = document.querySelectorAll('#sun-icon, #sun-icon-mobile');
    
    if (theme === 'light') {
      moonIcons.forEach(icon => icon.classList.remove('hidden'));
      sunIcons.forEach(icon => icon.classList.add('hidden'));
    } else {
      moonIcons.forEach(icon => icon.classList.add('hidden'));
      sunIcons.forEach(icon => icon.classList.remove('hidden'));
    }
  };

  const toggleTheme = () => {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // Initialize theme on page load
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    // Add click handlers to theme toggle buttons
    const themeToggles = document.querySelectorAll('#theme-toggle, #theme-toggle-mobile');
    themeToggles.forEach(toggle => {
      toggle.addEventListener('click', toggleTheme);
    });
  });
})();
