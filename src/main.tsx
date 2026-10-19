import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider, useTheme } from "./context/ThemeContext.tsx";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./lib/AuthProvider.tsx";

const ToasterWithTheme = () => {
  const { theme } = useTheme();

  return (
    <Toaster
      position="top-right"
      containerStyle={{
        top: 80,
      }}
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: "12px",
          background: theme === "dark" ? "#1f2937" : "#ffffff",
          color: theme === "dark" ? "#fff" : "#000",
          fontSize: "14px",
          fontWeight: "600",
          border: theme === "dark" ? "none" : "1px solid #e5e7eb",
        },
      }}
    />
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <AppWrapper>
          <ToasterWithTheme />
          <App />
        </AppWrapper>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>
);
