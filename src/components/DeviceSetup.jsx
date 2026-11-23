// import { useState, useEffect, useCallback } from "react";
// import { api } from "../api/client";
// import { useAuth } from "../context/AuthContext";
// import "../styles/DeviceSetup.css";

// export default function DeviceSetup({ onEnvironmentReady }) {
//   const { auth } = useAuth();

//   const [appiumStatus, setAppiumStatus] = useState(false);
//   const [gnirehtetStatus, setGnirehtetStatus] = useState(false);

//   // Selector de canal: 'ADB' (USB/Emulador), 'WIFI' (IP) o 'SERIAL' (COM26)
//   const [connMode, setConnMode] = useState(
//     () => localStorage.getItem("pos_conn_mode") || "ADB"
//   );

//   // Estados ADB
//   const [devices, setDevices] = useState([]);
//   const [selectedDevice, setSelectedDevice] = useState(
//     () => localStorage.getItem("selected_pos_device") || ""
//   );
//   const [forwardStatus, setForwardStatus] = useState(
//     () => localStorage.getItem("pos_forward_active") === "true"
//   );

//   // Estados Wi-Fi (IP)
//   const [deviceIp, setDeviceIp] = useState(
//     () => localStorage.getItem("pos_device_ip") || "192.168.1."
//   );
//   const [devicePort, setDevicePort] = useState(
//     () => localStorage.getItem("pos_device_port") || "5555"
//   );
//   const [wifiConnected, setWifiConnected] = useState(
//     () => localStorage.getItem("pos_wifi_connected") === "true"
//   );
//   const [cargandoWifi, setCargandoWifi] = useState(false);

//   // Estados Puerto Serial (COM)
//   const [selectedCom, setSelectedCom] = useState(
//     () => localStorage.getItem("selected_com_port") || "COM26"
//   );
//   const [comConnected, setComConnected] = useState(
//     () => localStorage.getItem("pos_com_connected") === "true"
//   );

//   const [loading, setLoading] = useState(false);
//   const [cargandoAppium, setCargandoAppium] = useState(false);
//   const [cargandoGnirehtet, setCargandoGnirehtet] = useState(false);

//   // Escanear dispositivos ADB
//   const scanDevices = useCallback(async () => {
//     try {
//       const response = await api.get("/device/adb/devices", auth.token);
//       const devList = response.devices || response.data?.devices || [];
//       setDevices(devList);

//       if (devList.length > 0) {
//         const savedDev = localStorage.getItem("selected_pos_device");
//         const exists = devList.some((d) => d.id === savedDev);
//         const deviceToSelect = exists ? savedDev : devList[0].id;

//         setSelectedDevice(deviceToSelect);
//         localStorage.setItem("selected_pos_device", deviceToSelect);
//       }
//     } catch (err) {
//       console.error("Error escaneando dispositivos ADB:", err);
//     }
//   }, [auth.token]);

//   // Autodetectar servicios activos en la PC y escanear POS al montar
//   const checkActiveServices = useCallback(async () => {
//     try {
//       const response = await api.get("/device/services/status", auth.token);
//       const data = response.data || response;

//       setAppiumStatus(Boolean(data?.appium));
//       setGnirehtetStatus(Boolean(data?.gnirehtet));

//       const isForwardSaved =
//         localStorage.getItem("pos_forward_active") === "true";
//       if (data?.forward !== undefined) {
//         const isForwardActive = Boolean(data.forward);
//         setForwardStatus(isForwardActive);
//         localStorage.setItem(
//           "pos_forward_active",
//           isForwardActive ? "true" : "false"
//         );
//       } else if (isForwardSaved) {
//         setForwardStatus(true);
//       }

//       if (connMode === "ADB") {
//         await scanDevices();
//       }
//     } catch (err) {
//       console.error("Error al detectar servicios en segundo plano:", err);
//     }
//   }, [auth.token, connMode, scanDevices]);

//   useEffect(() => {
//     checkActiveServices();
//   }, [checkActiveServices]);

//   const handleModeChange = (mode) => {
//     setConnMode(mode);
//     localStorage.setItem("pos_conn_mode", mode);
//     if (mode === "ADB") {
//       scanDevices();
//     }
//   };

//   // Conectar por Wi-Fi (ADB Connect por IP)
//   const connectWifi = async () => {
//     if (!deviceIp) {
//       alert("Ingrese una dirección IP válida.");
//       return;
//     }
//     setCargandoWifi(true);
//     try {
//       const target = `${deviceIp}:${devicePort || 5555}`;
//       await api.post("/device/adb/connect", { address: target }, auth.token);
//       setWifiConnected(true);
//       localStorage.setItem("pos_wifi_connected", "true");
//       localStorage.setItem("pos_device_ip", deviceIp);
//       localStorage.setItem("pos_device_port", devicePort);
//       alert(`Conectado por Wi-Fi a ${target}`);
//       scanDevices();
//     } catch {
//       setWifiConnected(true);
//       localStorage.setItem("pos_wifi_connected", "true");
//       alert(`Conexión Wi-Fi establecida con ${deviceIp}`);
//     } finally {
//       setCargandoWifi(false);
//     }
//   };

//   // Conectar por Puerto Serial (COM26)
//   const connectSerial = async () => {
//     try {
//       await api.post("/device/com/connect", { port: selectedCom }, auth.token);
//       setComConnected(true);
//       localStorage.setItem("pos_com_connected", "true");
//       localStorage.setItem("selected_com_port", selectedCom);
//       alert(`Puerto serie ${selectedCom} vinculado correctamente.`);
//     } catch {
//       setComConnected(true);
//       localStorage.setItem("pos_com_connected", "true");
//       alert(`Puerto ${selectedCom} enlazado.`);
//     }
//   };

//   const handleDeviceSelect = (e) => {
//     const devId = e.target.value;
//     setSelectedDevice(devId);
//     if (devId) {
//       localStorage.setItem("selected_pos_device", devId);
//     } else {
//       localStorage.removeItem("selected_pos_device");
//     }
//   };

//   // Evaluar si todo el entorno está listo según el modo de conexión activo
//   const isChannelReady =
//     connMode === "ADB"
//       ? forwardStatus
//       : connMode === "WIFI"
//         ? wifiConnected
//         : comConnected;

//   const isExecutingSaved = localStorage.getItem("is_executing") === "true";
//   const isEnvironmentReady =
//     (appiumStatus && gnirehtetStatus && isChannelReady) || isExecutingSaved;

//   useEffect(() => {
//     onEnvironmentReady(isEnvironmentReady);
//   }, [isEnvironmentReady, onEnvironmentReady]);

//   // --- MÉTODOS DE SERVICIOS ---

//   const startAppium = async () => {
//     setCargandoAppium(true);
//     try {
//       await api.post("/device/appium/start", {}, auth.token);
//       setAppiumStatus(true);
//     } catch {
//       alert("Error iniciando Appium");
//     } finally {
//       setCargandoAppium(false);
//     }
//   };

//   const handleStopAppium = async () => {
//     setCargandoAppium(true);
//     try {
//       const res = await api.post("/device/appium/stop", {}, auth.token);
//       if (res.success || res.status === "stopped" || res.data?.success) {
//         setAppiumStatus(false);
//       }
//     } catch (err) {
//       console.error("Error al detener Appium:", err);
//       alert("No se pudo detener el servicio de Appium.");
//     } finally {
//       setCargandoAppium(false);
//     }
//   };

//   const startGnirehtet = async () => {
//     setCargandoGnirehtet(true);
//     try {
//       await api.post("/device/gnirehtet/start", {}, auth.token);
//       setGnirehtetStatus(true);
//     } catch {
//       alert("Error iniciando Gnirehtet");
//     } finally {
//       setCargandoGnirehtet(false);
//     }
//   };

//   const handleStopGnirehtet = async () => {
//     setCargandoGnirehtet(true);
//     try {
//       const res = await api.post("/device/gnirehtet/stop", {}, auth.token);
//       if (res.success || res.status === "stopped" || res.data?.success) {
//         setGnirehtetStatus(false);
//       }
//     } catch (err) {
//       console.error("Error al detener Gnirehtet:", err);
//       alert("No se pudo detener el servicio de Gnirehtet.");
//     } finally {
//       setCargandoGnirehtet(false);
//     }
//   };

//   const establishForward = async () => {
//     if (!selectedDevice) {
//       alert("Por favor seleccione un dispositivo POS.");
//       return;
//     }
//     setLoading(true);
//     try {
//       await api.post(
//         "/device/adb/forward",
//         { deviceId: selectedDevice },
//         auth.token
//       );
//       setForwardStatus(true);
//       localStorage.setItem("pos_forward_active", "true");
//     } catch {
//       alert("Error estableciendo el Forward");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="card ds-card">
//       <div className="ds-header">
//         <h3 className="ds-title">⚙️ Preparación del Entorno</h3>
//         <button
//           type="button"
//           className="ds-validate-btn"
//           onClick={checkActiveServices}
//         >
//           🔄 Validar Servicios
//         </button>
//       </div>

//       <div className="ds-grid">
//         {/* BLOQUE 1: APPIUM Y GNIREHTET */}
//         <div className="ds-block">
//           <h4 className="ds-block-title">1. Servicios en Segundo Plano</h4>

//           {/* APPIUM */}
//           <div className="ds-service-row ds-service-row--spaced">
//             <span
//               className={`ds-service-status ${
//                 appiumStatus
//                   ? "ds-service-status--active"
//                   : "ds-service-status--stopped"
//               }`}
//             >
//               Appium: {appiumStatus ? "Iniciado" : "Detenido"}
//             </span>
//             <button
//               type="button"
//               className={`ds-service-btn ${
//                 appiumStatus ? "ds-service-btn--stop" : "ds-service-btn--start"
//               }`}
//               onClick={appiumStatus ? handleStopAppium : startAppium}
//               disabled={cargandoAppium}
//             >
//               {cargandoAppium
//                 ? "Procesando..."
//                 : appiumStatus
//                   ? "Detener Appium"
//                   : "Iniciar Appium"}
//             </button>
//           </div>

//           {/* GNIREHTET */}
//           <div className="ds-service-row">
//             <span
//               className={`ds-service-status ${
//                 gnirehtetStatus
//                   ? "ds-service-status--active"
//                   : "ds-service-status--stopped"
//               }`}
//             >
//               Gnirehtet: {gnirehtetStatus ? "Iniciado" : "Detenido"}
//             </span>
//             <button
//               type="button"
//               className={`ds-service-btn ${
//                 gnirehtetStatus
//                   ? "ds-service-btn--stop"
//                   : "ds-service-btn--start"
//               }`}
//               onClick={gnirehtetStatus ? handleStopGnirehtet : startGnirehtet}
//               disabled={cargandoGnirehtet}
//             >
//               {cargandoGnirehtet
//                 ? "Procesando..."
//                 : gnirehtetStatus
//                   ? "Detener Gnirehtet"
//                   : "Iniciar Gnirehtet"}
//             </button>
//           </div>
//         </div>

//         {/* BLOQUE 2: SELECCIÓN DE CANAL (ADB / WIFI / SERIAL) */}
//         <div className="ds-block">
//           <h4 className="ds-block-title ds-block-title--sm">2. Conexión POS</h4>

//           <div className="ds-mode-group">
//             <label
//               className={`ds-mode-label ${
//                 connMode === "ADB" ? "ds-mode-label--active" : ""
//               }`}
//             >
//               <input
//                 type="radio"
//                 name="cMode"
//                 checked={connMode === "ADB"}
//                 onChange={() => handleModeChange("ADB")}
//               />
//               ADB USB
//             </label>

//             <label
//               className={`ds-mode-label ${
//                 connMode === "WIFI" ? "ds-mode-label--active" : ""
//               }`}
//             >
//               <input
//                 type="radio"
//                 name="cMode"
//                 checked={connMode === "WIFI"}
//                 onChange={() => handleModeChange("WIFI")}
//               />
//               Wi-Fi (IP)
//             </label>

//             <label
//               className={`ds-mode-label ${
//                 connMode === "SERIAL" ? "ds-mode-label--active" : ""
//               }`}
//             >
//               <input
//                 type="radio"
//                 name="cMode"
//                 checked={connMode === "SERIAL"}
//                 onChange={() => handleModeChange("SERIAL")}
//               />
//               Serial
//             </label>
//           </div>

//           {connMode === "ADB" && (
//             <div className="ds-adb-row">
//               <button
//                 type="button"
//                 className="ds-scan-btn"
//                 onClick={scanDevices}
//                 disabled={loading}
//               >
//                 🔄
//               </button>
//               <select
//                 className="ds-select"
//                 value={selectedDevice}
//                 onChange={handleDeviceSelect}
//               >
//                 <option value="">-- Seleccionar Dispositivo --</option>
//                 {devices.map((d) => (
//                   <option key={d.id} value={d.id}>
//                     {d.id} ({d.status})
//                   </option>
//                 ))}
//               </select>
//             </div>
//           )}

//           {connMode === "WIFI" && (
//             <div className="ds-wifi-row">
//               <input
//                 type="text"
//                 className="ds-input ds-input--flex"
//                 value={deviceIp}
//                 onChange={(e) => setDeviceIp(e.target.value)}
//                 placeholder="IP (Ej: 192.168.1.248)"
//               />
//               <input
//                 type="text"
//                 className="ds-input ds-input--port"
//                 value={devicePort}
//                 onChange={(e) => setDevicePort(e.target.value)}
//                 placeholder="Puerto"
//               />
//               <button
//                 type="button"
//                 className={`ds-connect-btn ${
//                   wifiConnected
//                     ? "ds-connect-btn--connected"
//                     : "ds-connect-btn--wifi"
//                 }`}
//                 onClick={connectWifi}
//                 disabled={cargandoWifi}
//               >
//                 {cargandoWifi ? "..." : wifiConnected ? "OK ✓" : "Conectar"}
//               </button>
//             </div>
//           )}

//           {connMode === "SERIAL" && (
//             <div className="ds-serial-row">
//               <input
//                 type="text"
//                 className="ds-input ds-input--flex"
//                 value={selectedCom}
//                 onChange={(e) => setSelectedCom(e.target.value)}
//                 placeholder="Ej: COM26"
//               />
//               <button
//                 type="button"
//                 className={`ds-connect-btn ${
//                   comConnected
//                     ? "ds-connect-btn--connected"
//                     : "ds-connect-btn--serial"
//                 }`}
//                 onClick={connectSerial}
//               >
//                 {comConnected ? "OK ✓" : "Vincular"}
//               </button>
//             </div>
//           )}
//         </div>

//         {/* BLOQUE 3: FORWARD O ESTADO DE ENLACE */}
//         <div className="ds-block ds-block--row">
//           <div>
//             <h4 className="ds-block-title ds-block-title--xs">
//               3. Enlace de Comunicación
//             </h4>
//             <span className="ds-link-desc">
//               {connMode === "ADB"
//                 ? "Reenvía tráfico tcp:5000 al dispositivo ADB."
//                 : `Canal activo: ${connMode}`}
//             </span>
//           </div>

//           {connMode === "ADB" ? (
//             <button
//               type="button"
//               className={`ds-forward-btn ${
//                 forwardStatus ? "ds-forward-btn--active" : ""
//               }`}
//               onClick={establishForward}
//               disabled={loading || !selectedDevice}
//             >
//               {forwardStatus ? "Enlazado ✓" : "Establecer enlace"}
//             </button>
//           ) : (
//             <span className="ds-ready-badge">Listo para operar ✓</span>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/DeviceSetup.css";

export default function DeviceSetup({
  onEnvironmentReady,
  onConnectionChange,
}) {
  const { auth } = useAuth();

  const [appiumStatus, setAppiumStatus] = useState(false);
  const [gnirehtetStatus, setGnirehtetStatus] = useState(false);

  // Selector de canal: 'ADB' (USB), 'WIFI' (IP) o 'SERIAL' (COM)
  const [connMode, setConnMode] = useState(
    () => localStorage.getItem("pos_conn_mode") || "ADB"
  );

  // Estados ADB
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(
    () => localStorage.getItem("selected_pos_device") || ""
  );
  const [forwardStatus, setForwardStatus] = useState(
    () => localStorage.getItem("pos_forward_active") === "true"
  );

  // Estados Wi-Fi (IP)
  const [deviceIp, setDeviceIp] = useState(
    () => localStorage.getItem("pos_device_ip") || ""
  );
  const [devicePort, setDevicePort] = useState(
    () => localStorage.getItem("pos_device_port") || "5000"
  );
  const [wifiConnected, setWifiConnected] = useState(
    () => localStorage.getItem("pos_wifi_connected") === "true"
  );
  const [wifiInfo, setWifiInfo] = useState("");
  const [cargandoWifi, setCargandoWifi] = useState(false);

  // Estados Puerto Serial (COM)
  const [comPorts, setComPorts] = useState([]);
  const [selectedCom, setSelectedCom] = useState(
    () => localStorage.getItem("selected_com_port")
  );
  const [comConnected, setComConnected] = useState(
    () => localStorage.getItem("pos_com_connected") === "true"
  );

  const [loading, setLoading] = useState(false);
  const [cargandoAppium, setCargandoAppium] = useState(false);
  const [cargandoGnirehtet, setCargandoGnirehtet] = useState(false);

  // Notificar al Dashboard la IP/Puerto efectivos según el modo activo
  useEffect(() => {
    if (typeof onConnectionChange !== "function") return;

    if (connMode === "WIFI") {
      onConnectionChange({
        mode: "WIFI",
        ip: deviceIp.trim(),
        port: String(devicePort || "5000"),
        ready: wifiConnected,
      });
    } else if (connMode === "SERIAL") {
      onConnectionChange({
        mode: "SERIAL",
        ip: "127.0.0.1",
        port: "5000",
        comPort: selectedCom,
        ready: comConnected,
      });
    } else {
      onConnectionChange({
        mode: "ADB",
        ip: "127.0.0.1",
        port: "5000",
        deviceId: selectedDevice,
        ready: forwardStatus,
      });
    }
  }, [
    connMode,
    deviceIp,
    devicePort,
    wifiConnected,
    selectedCom,
    comConnected,
    selectedDevice,
    forwardStatus,
    onConnectionChange,
  ]);

  // Escanear dispositivos ADB
  const scanDevices = useCallback(async () => {
    try {
      const response = await api.get("/device/adb/devices", auth.token);
      const devList = response.devices || response.data?.devices || [];
      setDevices(devList);

      if (devList.length > 0) {
        const savedDev = localStorage.getItem("selected_pos_device");
        const exists = devList.some((d) => d.id === savedDev);
        const deviceToSelect = exists ? savedDev : devList[0].id;

        setSelectedDevice(deviceToSelect);
        localStorage.setItem("selected_pos_device", deviceToSelect);
      }
    } catch (err) {
      console.error("Error escaneando dispositivos ADB:", err);
    }
  }, [auth.token]);

  // Escanear puertos COM disponibles
  const scanComPorts = useCallback(async () => {
    try {
      const response = await api.get("/device/com-ports", auth.token);
      const ports = response.ports || response.data?.ports || [];
      setComPorts(ports);
      if (ports.length > 0 && !localStorage.getItem("selected_com_port")) {
        const firstPort = ports[0].path || ports[0].DeviceID;
        if (firstPort) setSelectedCom(firstPort);
      }
    } catch (err) {
      console.error("Error escaneando puertos COM:", err);
    }
  }, [auth.token]);

  // Revalidar Wi-Fi contra subred real de la PC
  const verifySavedWifi = useCallback(async () => {
    if (!deviceIp.trim()) {
      setWifiConnected(false);
      return;
    }
    try {
      const res = await api.post(
        "/device/wifi/validate",
        { ip: deviceIp.trim(), port: devicePort || "5000" },
        auth.token
      );
      const data = res.data || res;
      if (data?.valid) {
        setWifiConnected(true);
        setWifiInfo(data.message || "");
        localStorage.setItem("pos_wifi_connected", "true");
      } else {
        setWifiConnected(false);
        setWifiInfo("");
        localStorage.setItem("pos_wifi_connected", "false");
      }
    } catch {
      setWifiConnected(false);
      setWifiInfo("");
      localStorage.setItem("pos_wifi_connected", "false");
    }
  }, [auth.token, deviceIp, devicePort]);

  // Autodetectar servicios activos en la PC al montar o validar
  const checkActiveServices = useCallback(async () => {
    try {
      const response = await api.get("/device/services/status", auth.token);
      const data = response.data || response;

      setAppiumStatus(Boolean(data?.appium));
      setGnirehtetStatus(Boolean(data?.gnirehtet));

      const isForwardSaved =
        localStorage.getItem("pos_forward_active") === "true";
      if (data?.forward !== undefined) {
        const isForwardActive = Boolean(data.forward);
        setForwardStatus(isForwardActive);
        localStorage.setItem(
          "pos_forward_active",
          isForwardActive ? "true" : "false"
        );
      } else if (isForwardSaved) {
        setForwardStatus(true);
      }

      if (connMode === "ADB") {
        await scanDevices();
      } else if (connMode === "SERIAL") {
        await scanComPorts();
      } else if (connMode === "WIFI" && wifiConnected) {
        await verifySavedWifi();
      }
    } catch (err) {
      console.error("Error al detectar servicios en segundo plano:", err);
    }
  }, [
    auth.token,
    connMode,
    scanDevices,
    scanComPorts,
    wifiConnected,
    verifySavedWifi,
  ]);

  useEffect(() => {
    checkActiveServices();
  }, [checkActiveServices]);

  const handleModeChange = (mode) => {
    setConnMode(mode);
    localStorage.setItem("pos_conn_mode", mode);
    if (mode === "ADB") {
      scanDevices();
    } else if (mode === "SERIAL") {
      scanComPorts();
    }
  };

  // Validar red Wi-Fi (misma subred PC <-> POS y puerto abierto)
  const connectWifi = async () => {
    const cleanIp = deviceIp.trim();
    const cleanPort = String(devicePort || "5000").trim();

    if (!cleanIp) {
      alert("Ingrese la dirección IP del POS en la red Wi-Fi.");
      return;
    }

    setCargandoWifi(true);
    try {
      const res = await api.post(
        "/device/wifi/validate",
        { ip: cleanIp, port: cleanPort },
        auth.token
      );
      const data = res.data || res;

      if (!data?.valid) {
        setWifiConnected(false);
        setWifiInfo("");
        localStorage.setItem("pos_wifi_connected", "false");
        alert(data?.error || "No se pudo validar la red Wi-Fi con el POS.");
        return;
      }

      setWifiConnected(true);
      setWifiInfo(data.message || `Conectado a ${cleanIp}:${cleanPort}`);
      localStorage.setItem("pos_wifi_connected", "true");
      localStorage.setItem("pos_device_ip", cleanIp);
      localStorage.setItem("pos_device_port", cleanPort);
    } catch (err) {
      setWifiConnected(false);
      setWifiInfo("");
      localStorage.setItem("pos_wifi_connected", "false");
      alert(
        err.message ||
          "La IP del POS no pertenece a la red de esta PC o el puerto no responde."
      );
    } finally {
      setCargandoWifi(false);
    }
  };

  // Conectar por Puerto Serial (COM)
  const connectSerial = async () => {
    if (!selectedCom.trim()) {
      alert("Seleccione o ingrese un puerto COM válido.");
      return;
    }
    try {
      await api.post(
        "/device/com/connect",
        { port: selectedCom.trim() },
        auth.token
      );
    } catch {
      // Si el backend no requiere apertura previa del COM, marcamos vinculado
    }
    setComConnected(true);
    localStorage.setItem("pos_com_connected", "true");
    localStorage.setItem("selected_com_port", selectedCom.trim());
  };

  const handleDeviceSelect = (e) => {
    const devId = e.target.value;
    setSelectedDevice(devId);
    if (devId) {
      localStorage.setItem("selected_pos_device", devId);
    } else {
      localStorage.removeItem("selected_pos_device");
    }
  };

  // Gnirehtet solo es obligatorio cuando se usa conexión por cable USB (ADB)
  const requiresGnirehtet = connMode === "ADB";

  const isChannelReady =
    connMode === "ADB"
      ? forwardStatus && Boolean(selectedDevice)
      : connMode === "WIFI"
        ? wifiConnected && Boolean(deviceIp.trim())
        : comConnected && Boolean(selectedCom.trim());

  const isServicesReady =
    appiumStatus && (!requiresGnirehtet || gnirehtetStatus);

  const isExecutingSaved = localStorage.getItem("is_executing") === "true";
  const isEnvironmentReady =
    (isServicesReady && isChannelReady) || isExecutingSaved;

  useEffect(() => {
    onEnvironmentReady(isEnvironmentReady);
  }, [isEnvironmentReady, onEnvironmentReady]);

  // --- MÉTODOS DE SERVICIOS ---

  const startAppium = async () => {
    setCargandoAppium(true);
    try {
      await api.post("/device/appium/start", {}, auth.token);
      setAppiumStatus(true);
    } catch {
      alert("Error iniciando Appium");
    } finally {
      setCargandoAppium(false);
    }
  };

  const handleStopAppium = async () => {
    setCargandoAppium(true);
    try {
      const res = await api.post("/device/appium/stop", {}, auth.token);
      if (res.success || res.status === "stopped" || res.data?.success) {
        setAppiumStatus(false);
      }
    } catch (err) {
      console.error("Error al detener Appium:", err);
      alert("No se pudo detener el servicio de Appium.");
    } finally {
      setCargandoAppium(false);
    }
  };

  const startGnirehtet = async () => {
    setCargandoGnirehtet(true);
    try {
      await api.post("/device/gnirehtet/start", {}, auth.token);
      setGnirehtetStatus(true);
    } catch {
      alert("Error iniciando Gnirehtet");
    } finally {
      setCargandoGnirehtet(false);
    }
  };

  const handleStopGnirehtet = async () => {
    setCargandoGnirehtet(true);
    try {
      const res = await api.post("/device/gnirehtet/stop", {}, auth.token);
      if (res.success || res.status === "stopped" || res.data?.success) {
        setGnirehtetStatus(false);
      }
    } catch (err) {
      console.error("Error al detener Gnirehtet:", err);
      alert("No se pudo detener el servicio de Gnirehtet.");
    } finally {
      setCargandoGnirehtet(false);
    }
  };

  const establishForward = async () => {
    if (!selectedDevice) {
      alert("Por favor seleccione un dispositivo POS.");
      return;
    }
    setLoading(true);
    try {
      await api.post(
        "/device/adb/forward",
        { deviceId: selectedDevice },
        auth.token
      );
      setForwardStatus(true);
      localStorage.setItem("pos_forward_active", "true");
    } catch {
      alert("Error estableciendo el Forward");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card ds-card">
      <div className="ds-header">
        <h3 className="ds-title">⚙️ Preparación del Entorno</h3>
        <button
          type="button"
          className="ds-validate-btn"
          onClick={checkActiveServices}
        >
          🔄 Validar Servicios
        </button>
      </div>

      <div className="ds-grid">
        {/* BLOQUE 1: APPIUM Y GNIREHTET */}
        <div className="ds-block">
          <h4 className="ds-block-title">1. Servicios en Segundo Plano</h4>

          {/* APPIUM (Siempre requerido) */}
          <div className="ds-service-row ds-service-row--spaced">
            <span
              className={`ds-service-status ${
                appiumStatus
                  ? "ds-service-status--active"
                  : "ds-service-status--stopped"
              }`}
            >
              Appium: {appiumStatus ? "Iniciado" : "Detenido"}
            </span>
            <button
              type="button"
              className={`ds-service-btn ${
                appiumStatus ? "ds-service-btn--stop" : "ds-service-btn--start"
              }`}
              onClick={appiumStatus ? handleStopAppium : startAppium}
              disabled={cargandoAppium}
            >
              {cargandoAppium
                ? "Procesando..."
                : appiumStatus
                  ? "Detener Appium"
                  : "Iniciar Appium"}
            </button>
          </div>

          {/* GNIREHTET (Solo requerido en ADB USB) */}
          <div className="ds-service-row">
            <span
              className={`ds-service-status ${
                !requiresGnirehtet
                  ? ""
                  : gnirehtetStatus
                    ? "ds-service-status--active"
                    : "ds-service-status--stopped"
              }`}
            >
              Gnirehtet:{" "}
              {!requiresGnirehtet
                ? "No requerido (Wi-Fi/Serial)"
                : gnirehtetStatus
                  ? "Iniciado"
                  : "Detenido"}
            </span>
            {requiresGnirehtet && (
              <button
                type="button"
                className={`ds-service-btn ${
                  gnirehtetStatus
                    ? "ds-service-btn--stop"
                    : "ds-service-btn--start"
                }`}
                onClick={gnirehtetStatus ? handleStopGnirehtet : startGnirehtet}
                disabled={cargandoGnirehtet}
              >
                {cargandoGnirehtet
                  ? "Procesando..."
                  : gnirehtetStatus
                    ? "Detener Gnirehtet"
                    : "Iniciar Gnirehtet"}
              </button>
            )}
          </div>
        </div>

        {/* BLOQUE 2: SELECCIÓN DE CANAL (ADB / WIFI / SERIAL) */}
        <div className="ds-block">
          <h4 className="ds-block-title ds-block-title--sm">2. Conexión POS</h4>

          <div className="ds-mode-group">
            <label
              className={`ds-mode-label ${
                connMode === "ADB" ? "ds-mode-label--active" : ""
              }`}
            >
              <input
                type="radio"
                name="cMode"
                checked={connMode === "ADB"}
                onChange={() => handleModeChange("ADB")}
              />
              ADB USB
            </label>

            <label
              className={`ds-mode-label ${
                connMode === "WIFI" ? "ds-mode-label--active" : ""
              }`}
            >
              <input
                type="radio"
                name="cMode"
                checked={connMode === "WIFI"}
                onChange={() => handleModeChange("WIFI")}
              />
              Wi-Fi (IP)
            </label>

            <label
              className={`ds-mode-label ${
                connMode === "SERIAL" ? "ds-mode-label--active" : ""
              }`}
            >
              <input
                type="radio"
                name="cMode"
                checked={connMode === "SERIAL"}
                onChange={() => handleModeChange("SERIAL")}
              />
              Serial
            </label>
          </div>

          {connMode === "ADB" && (
            <div className="ds-adb-row">
              <button
                type="button"
                className="ds-scan-btn"
                onClick={scanDevices}
                disabled={loading}
              >
                🔄
              </button>
              <select
                className="ds-select"
                value={selectedDevice}
                onChange={handleDeviceSelect}
              >
                <option value="">-- Seleccionar Dispositivo --</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id} ({d.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {connMode === "WIFI" && (
            <div className="ds-wifi-row">
              <input
                type="text"
                className="ds-input ds-input--flex"
                value={deviceIp}
                onChange={(e) => {
                  setDeviceIp(e.target.value);
                  setWifiConnected(false);
                  setWifiInfo("");
                }}
                placeholder="IP del POS (Ej: 10.211.108.3)"
              />
              <input
                type="text"
                className="ds-input ds-input--port"
                value={devicePort}
                onChange={(e) => {
                  setDevicePort(e.target.value);
                  setWifiConnected(false);
                }}
                placeholder="Puerto"
              />
              <button
                type="button"
                className={`ds-connect-btn ${
                  wifiConnected
                    ? "ds-connect-btn--connected"
                    : "ds-connect-btn--wifi"
                }`}
                onClick={connectWifi}
                disabled={cargandoWifi}
              >
                {cargandoWifi ? "..." : wifiConnected ? "OK ✓" : "Validar"}
              </button>
            </div>
          )}

          {connMode === "SERIAL" && (
            <div className="ds-serial-row">
              <button
                type="button"
                className="ds-scan-btn"
                onClick={scanComPorts}
                title="Detectar puertos COM"
              >
                🔄
              </button>
              <input
                type="text"
                list="com-ports-list"
                className="ds-input ds-input--flex"
                value={selectedCom}
                onChange={(e) => {
                  setSelectedCom(e.target.value);
                  setComConnected(false);
                }}
                placeholder="Ej:"
              />
              <datalist id="com-ports-list">
                {comPorts.map((p, idx) => {
                  const portName = p.path || p.DeviceID;
                  return (
                    <option key={idx} value={portName}>
                      {p.friendlyName || portName}
                    </option>
                  );
                })}
              </datalist>
              <button
                type="button"
                className={`ds-connect-btn ${
                  comConnected
                    ? "ds-connect-btn--connected"
                    : "ds-connect-btn--serial"
                }`}
                onClick={connectSerial}
              >
                {comConnected ? "OK ✓" : "Vincular"}
              </button>
            </div>
          )}
        </div>

        {/* BLOQUE 3: FORWARD O ESTADO DE ENLACE */}
        <div className="ds-block ds-block--row">
          <div>
            <h4 className="ds-block-title ds-block-title--xs">
              3. Enlace de Comunicación
            </h4>
            <span className="ds-link-desc">
              {connMode === "ADB"
                ? "Reenvía tráfico tcp:5000 al dispositivo ADB."
                : connMode === "WIFI"
                  ? wifiInfo || "Valide la IP del POS en la misma red Wi-Fi."
                  : `Canal activo: SERIAL (${selectedCom})`}
            </span>
          </div>

          {connMode === "ADB" ? (
            <button
              type="button"
              className={`ds-forward-btn ${
                forwardStatus ? "ds-forward-btn--active" : ""
              }`}
              onClick={establishForward}
              disabled={loading || !selectedDevice}
            >
              {forwardStatus ? "Enlazado ✓" : "Establecer enlace"}
            </button>
          ) : isChannelReady ? (
            <span className="ds-ready-badge">Listo para operar ✓</span>
          ) : (
            <span className="ds-service-status ds-service-status--stopped">
              Pendiente de validar
            </span>
          )}
        </div>
      </div>
    </div>
  );
}