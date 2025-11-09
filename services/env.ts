// services/env.ts

// Cambia esto si vas a probar en un CELULAR físico
const LOCAL_LAN_IP = "192.168.100.252"; // ← tu IP en la red (ver consola de Expo)

const DEV_URL = "http://192.168.100.252:3000"
 
export const BASE_URL = __DEV__
  ? DEV_URL
  : `http://${LOCAL_LAN_IP}:3000`; // prod local en LAN (ajusta según despliegue real)
