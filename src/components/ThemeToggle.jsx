import { useEffect } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";

const THEMES = ["light", "dark"];

export function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage("preview-theme", "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggle = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <button
      onClick={toggle}
      aria-label={`현재 테마: ${theme}. 클릭하면 전환됩니다.`}
    >
      {theme === "light" ? "🌙 다크" : "☀️ 라이트"}
    </button>
  );
}
