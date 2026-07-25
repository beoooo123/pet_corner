/// <reference types="vite/client" />

const ENV_VARS = {
  VITE_API_URL: import.meta.env.VITE_API_URL, // Không cần VITE_ ở key
  VITE_VNPAY_URL: import.meta.env.VITE_VNPAY_URL, // Không cần VITE_ ở key
  VITE_GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID, // Không cần VITE_ ở key
  VITE_GOOGLE_CLIENT_SECRET: import.meta.env.VITE_GOOGLE_CLIENT_SECRET, // Không cần VITE_ ở key
};

export default ENV_VARS;
