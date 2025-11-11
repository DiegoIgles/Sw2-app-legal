// services/env.ts
// Centraliza las URLs base para la app.
// Ajusta LOCAL_LAN_IP a la IP de tu máquina en la red cuando pruebes en un dispositivo físico.

// TypeScript: declarar __DEV__ como disponible (React Native/Expo define esta global)
declare const __DEV__: boolean;

const LOCAL_LAN_IP = "192.168.100.11"; // ← cambia según tu red

// Desarrollo (LAN) - HTTP / WS
const DEV_API = `http://${LOCAL_LAN_IP}:3000`;
const DEV_DOCS = `http://${LOCAL_LAN_IP}:8081`;
const DEV_WS = `ws://${LOCAL_LAN_IP}:3000`;

// Producción (reemplaza por tus dominios y usa HTTPS/WSS cuando tengas TLS)
const PROD_API = "http://your-api.example.com:3000";
const PROD_DOCS = "http://your-docs.example.com:8081";
const PROD_WS = "ws://your-api.example.com:3000";

export const API_BASE = __DEV__ ? DEV_API : PROD_API;
export const DOCS_BASE = __DEV__ ? DEV_DOCS : PROD_DOCS;
export const WS_BASE = __DEV__ ? DEV_WS : PROD_WS;

export const LOCAL_IP = LOCAL_LAN_IP;
