import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ChatbotController = () => {
  const location = useLocation();
  const allowedRoutes = [
    "/",
    "/product",
    "/service",
    "/contact",
    "/info",
    "/about-us",
    "/detail/:id",
  ];

  useEffect(() => {
    const isRouteAllowed = () => {
      return allowedRoutes.some((route) => {
        if (route.includes(":")) {
          const pattern = route.replace(/:id/, "[^/]+");
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(location.pathname);
        }
        return route === location.pathname;
      });
    };

    const updateChatbotVisibility = () => {
      const isAllowed = isRouteAllowed();
      console.log("Route allowed:", isAllowed, "Path:", location.pathname);

      // Tìm phần tử Preny trong DOM
      const prenyWidget = document.querySelector("div.preny-open");
      if (!prenyWidget) {
        console.log("Preny widget not found");
        return;
      }

      // Truy cập shadow DOM
      const shadowRoot = prenyWidget.closest(
        'div[style*="z-index: 10000"]'
      )?.shadowRoot;
      if (shadowRoot) {
        const openButton = shadowRoot.querySelector("#preny-open");
        if (openButton) {
          (openButton as HTMLElement).style.display = isAllowed
            ? "block"
            : "none";
        }

        const chatContainer = shadowRoot.querySelector("#preny-chat-container");
        if (chatContainer) {
          (chatContainer as HTMLElement).style.display = isAllowed
            ? "block"
            : "none";
        }
      }
    };

    // Dùng MutationObserver để phát hiện khi Preny widget được thêm vào DOM
    const observer = new MutationObserver(() => {
      updateChatbotVisibility();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Cập nhật ngay lập tức
    updateChatbotVisibility();

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, [location.pathname]);

  return null;
};

export default ChatbotController;
