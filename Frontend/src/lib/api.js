import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.MODE === "development" ? "http://localhost:6001" : import.meta.env.VITE_BACKEND_URL,
    withCredentials: true,
    validateStatus: (status) => status < 500,
});

export default api;