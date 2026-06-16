import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

/**
 * Operarios suelen usar WiFi de planta sin internet público.
 * Basta con enlace activo para alcanzar el gateway LAN (p. ej. 192.168.x.x:8080).
 */
export function useOnline() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const apply = (state: { isConnected: boolean | null }) => {
      setOnline(state.isConnected === true);
    };
    const sub = NetInfo.addEventListener(apply);
    void NetInfo.fetch().then(apply);
    return () => sub();
  }, []);

  return online;
}
