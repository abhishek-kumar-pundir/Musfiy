import axios from "axios";

const isDev = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.MODE === "development" : process.env.NODE_ENV !== "production";
const backendUrl = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_BACKEND_URL : process.env.VITE_BACKEND_URL;

const api = axios.create({
    baseURL: isDev ? "http://localhost:6001" : backendUrl,
    withCredentials: true,
    timeout: 8000,
    validateStatus: (status) => status < 500,
});

export default api;