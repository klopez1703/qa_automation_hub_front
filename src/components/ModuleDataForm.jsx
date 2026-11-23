// import { useState, useEffect } from "react";
// import { useAuth } from "../context/AuthContext";
// import "../styles/ModuleDataForm.css";

// const INITIAL_CONNECTION = {
//   ip: "127.0.0.1",
//   port: "5000",
// };

// const INITIAL_PARAMS = {
//   monto: "1",
//   moneda: "0340",
//   propina: "0.00",
//   impuesto: "0",
//   cuotas: "1",
//   facturaAnular: "",
// };

// export default function ModuleDataForm({
//   selectedProject,
//   selectedModule,
//   selectedSubModule,
//   setFormData,
// }) {
//   const { auth } = useAuth();

//   const [connection, setConnection] = useState(INITIAL_CONNECTION);
//   const [params, setParams] = useState(INITIAL_PARAMS);
//   const [camposVisibles, setCamposVisibles] = useState([]);
//   const [loadingConfig, setLoadingConfig] = useState(false);

//   // Consultar al backend los campos requeridos según la selección actual de la BD
//   useEffect(() => {
//     if (!selectedProject || !selectedModule || !selectedSubModule) return;

//     const fetchConfiguracionCampos = async () => {
//       try {
//         setLoadingConfig(true);
//         const token = auth?.token || localStorage.getItem("token");
//         const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";

//         const query = new URLSearchParams({
//           project: selectedProject,
//           module: selectedModule,
//           submodule: selectedSubModule,
//         }).toString();

//         const res = await fetch(`${baseURL}/modules/config?${query}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (res.ok) {
//           const data = await res.json();
//           setCamposVisibles(data.camposRequeridos || []);
//         } else {
//           setCamposVisibles(["monto", "moneda"]);
//         }
//       } catch (error) {
//         console.error(
//           "Error al obtener la configuración de campos de la BD:",
//           error
//         );
//         setCamposVisibles(["monto", "moneda"]);
//       } finally {
//         setLoadingConfig(false);
//       }
//     };

//     fetchConfiguracionCampos();
//   }, [selectedProject, selectedModule, selectedSubModule, auth?.token]);

//   // Sincronizar con el estado padre preservando propiedades existentes (ej. history)
//   useEffect(() => {
//     setFormData((prev) => ({
//       ...prev,
//       connection,
//       parameters: params,
//     }));
//   }, [connection, params, setFormData]);

//   const handleParamChange = (campo, valor) => {
//     setParams((prev) => ({ ...prev, [campo]: valor }));
//   };

//   return (
//     <div className="mdf-wrapper" id="cardParametros">
//       {/* 1. Parámetros de Conexión DCL / POS */}
//       <div className="card contParametrosConexion mdf-card mdf-card--spaced">
//         <div className="head mdf-header">
//           <span className="num mdf-step-badge">1</span>
//           <div>
//             <h2 className="mdf-title">Conexión</h2>
//             <p className="mdf-subtitle">
//               Dónde está corriendo el servicio a probar.
//             </p>
//           </div>
//         </div>

//         <div className="mdf-grid">
//           <div className="field">
//             <label className="mdf-label">IP / Host</label>
//             <input
//               type="text"
//               className="input mdf-input"
//               value={connection.ip}
//               onChange={(e) =>
//                 setConnection((prev) => ({ ...prev, ip: e.target.value }))
//               }
//             />
//           </div>

//           <div className="field">
//             <label className="mdf-label">Puerto</label>
//             <input
//               type="text"
//               className="input mdf-input"
//               value={connection.port}
//               onChange={(e) =>
//                 setConnection((prev) => ({ ...prev, port: e.target.value }))
//               }
//             />
//           </div>
//         </div>
//       </div>

//       {/* 2. Parámetros dinámicos obtenidos desde la Base de Datos */}
//       <div className="card mdf-card">
//         <div className="head mdf-header mdf-header--lg">
//           <span className="num mdf-step-badge">2</span>
//           <div>
//             <h2 className="mdf-title">Datos de la transacción</h2>
//             <p className="mdf-subtitle">
//               {loadingConfig
//                 ? "Cargando campos dinámicos desde la BD..."
//                 : `Configuración para: ${selectedModule} › ${selectedSubModule}`}
//             </p>
//           </div>
//         </div>

//         {loadingConfig ? (
//           <div className="mdf-loading">
//             Sincronizando campos del submódulo...
//           </div>
//         ) : (
//           <div className="mdf-grid">
//             {camposVisibles.includes("monto") && (
//               <div className="field">
//                 <label className="mdf-label">Monto</label>
//                 <input
//                   type="number"
//                   step="0.01"
//                   className="input mdf-input"
//                   value={params.monto}
//                   onChange={(e) => handleParamChange("monto", e.target.value)}
//                 />
//               </div>
//             )}

//             {camposVisibles.includes("propina") && (
//               <div className="field">
//                 <label className="mdf-label">Propina</label>
//                 <input
//                   type="number"
//                   step="0.01"
//                   className="input mdf-input"
//                   value={params.propina}
//                   onChange={(e) => handleParamChange("propina", e.target.value)}
//                 />
//               </div>
//             )}

//             {camposVisibles.includes("moneda") && (
//               <div className="field">
//                 <label className="mdf-label">Moneda</label>
//                 <select
//                   className="input mdf-input mdf-input--select"
//                   value={params.moneda}
//                   onChange={(e) => handleParamChange("moneda", e.target.value)}
//                 >
//                   <option value="0340">0340 (Lempiras)</option>
//                   <option value="0840">0840 (Dólar)</option>
//                 </select>
//               </div>
//             )}

//             {camposVisibles.includes("impuesto") && (
//               <div className="field">
//                 <label className="mdf-label">Impuesto / ISV</label>
//                 <select
//                   className="input mdf-input mdf-input--select"
//                   value={params.impuesto}
//                   onChange={(e) =>
//                     handleParamChange("impuesto", e.target.value)
//                   }
//                 >
//                   <option value="0">0% (Exento)</option>
//                   <option value="0.15">15% (Estándar)</option>
//                   <option value="0.18">18% (Turismo)</option>
//                 </select>
//               </div>
//             )}

//             {camposVisibles.includes("cuotas") && (
//               <div className="field">
//                 <label className="mdf-label">Cuotas</label>
//                 <select
//                   className="input mdf-input mdf-input--select"
//                   value={params.cuotas}
//                   onChange={(e) => handleParamChange("cuotas", e.target.value)}
//                 >
//                   <option value="1">1 (Contado)</option>
//                   <option value="3">3 Meses</option>
//                   <option value="6">6 Meses</option>
//                   <option value="12">12 Meses</option>
//                 </select>
//               </div>
//             )}

//             {camposVisibles.includes("facturaAnular") && (
//               <div className="field mdf-field--full">
//                 <label className="mdf-label mdf-label--danger">
//                   Factura a Anular (Opcional)
//                 </label>
//                 <input
//                   type="text"
//                   placeholder="Dejar vacío para usar JSON automático"
//                   className="input mdf-input"
//                   value={params.facturaAnular}
//                   onChange={(e) =>
//                     handleParamChange("facturaAnular", e.target.value)
//                   }
//                 />
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/ModuleDataForm.css";

const INITIAL_PARAMS = {
  monto: "1",
  moneda: "0340",
  propina: "0.00",
  impuesto: "0",
  cuotas: "1",
  facturaAnular: "",
};

export default function ModuleDataForm({
  selectedProject,
  selectedModule,
  selectedSubModule,
  formData,
  setFormData,
}) {
  const { auth } = useAuth();

  const [params, setParams] = useState(INITIAL_PARAMS);
  const [camposVisibles, setCamposVisibles] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Leer directamente la conexión sincronizada desde ExecuteScenarioPage / DeviceSetup
  const connection = formData?.connection || { ip: "127.0.0.1", port: "5000" };

  // Consultar al backend los campos requeridos según la selección actual de la BD
  useEffect(() => {
    if (!selectedProject || !selectedModule || !selectedSubModule) return;

    const fetchConfiguracionCampos = async () => {
      try {
        setLoadingConfig(true);
        const token = auth?.token || localStorage.getItem("token");
        const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";

        const query = new URLSearchParams({
          project: selectedProject,
          module: selectedModule,
          submodule: selectedSubModule,
        }).toString();

        const res = await fetch(`${baseURL}/modules/config?${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setCamposVisibles(data.camposRequeridos || []);
        } else {
          setCamposVisibles(["monto", "moneda"]);
        }
      } catch (error) {
        console.error(
          "Error al obtener la configuración de campos de la BD:",
          error
        );
        setCamposVisibles(["monto", "moneda"]);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfiguracionCampos();
  }, [selectedProject, selectedModule, selectedSubModule, auth?.token]);

  // Sincronizar únicamente los parámetros dinámicos sin pisar formData.connection ni formData.history
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      parameters: params,
    }));
  }, [params, setFormData]);

  const handleConnectionFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      connection: {
        ...(prev.connection || { ip: "127.0.0.1", port: "5000" }),
        [field]: value,
      },
    }));
  };

  const handleParamChange = (campo, valor) => {
    setParams((prev) => ({ ...prev, [campo]: valor }));
  };

  return (
    <div className="mdf-wrapper" id="cardParametros">
      {/* 1. Parámetros de Conexión DCL / POS */}
      <div className="card contParametrosConexion mdf-card mdf-card--spaced">
        <div className="head mdf-header">
          <span className="num mdf-step-badge">1</span>
          <div>
            <h2 className="mdf-title">Conexión</h2>
            <p className="mdf-subtitle">
              Dónde está corriendo el servicio a probar.
            </p>
          </div>
        </div>

        <div className="mdf-grid">
          <div className="field">
            <label className="mdf-label">IP / Host</label>
            <input
              type="text"
              className="input mdf-input"
              value={connection.ip}
              onChange={(e) =>
                handleConnectionFieldChange("ip", e.target.value)
              }
            />
          </div>

          <div className="field">
            <label className="mdf-label">Puerto</label>
            <input
              type="text"
              className="input mdf-input"
              value={connection.port}
              onChange={(e) =>
                handleConnectionFieldChange("port", e.target.value)
              }
            />
          </div>
        </div>
      </div>

      {/* 2. Parámetros dinámicos obtenidos desde la Base de Datos */}
      <div className="card mdf-card">
        <div className="head mdf-header mdf-header--lg">
          <span className="num mdf-step-badge">2</span>
          <div>
            <h2 className="mdf-title">Datos de la transacción</h2>
            <p className="mdf-subtitle">
              {loadingConfig
                ? "Cargando campos dinámicos desde la BD..."
                : `Configuración para: ${selectedModule} › ${selectedSubModule}`}
            </p>
          </div>
        </div>

        {loadingConfig ? (
          <div className="mdf-loading">
            Sincronizando campos del submódulo...
          </div>
        ) : (
          <div className="mdf-grid">
            {camposVisibles.includes("monto") && (
              <div className="field">
                <label className="mdf-label">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  className="input mdf-input"
                  value={params.monto}
                  onChange={(e) => handleParamChange("monto", e.target.value)}
                />
              </div>
            )}

            {camposVisibles.includes("propina") && (
              <div className="field">
                <label className="mdf-label">Propina</label>
                <input
                  type="number"
                  step="0.01"
                  className="input mdf-input"
                  value={params.propina}
                  onChange={(e) => handleParamChange("propina", e.target.value)}
                />
              </div>
            )}

            {camposVisibles.includes("moneda") && (
              <div className="field">
                <label className="mdf-label">Moneda</label>
                <select
                  className="input mdf-input mdf-input--select"
                  value={params.moneda}
                  onChange={(e) => handleParamChange("moneda", e.target.value)}
                >
                  <option value="0340">0340 (Lempiras)</option>
                  <option value="0840">0840 (Dólar)</option>
                </select>
              </div>
            )}

            {camposVisibles.includes("impuesto") && (
              <div className="field">
                <label className="mdf-label">Impuesto / ISV</label>
                <select
                  className="input mdf-input mdf-input--select"
                  value={params.impuesto}
                  onChange={(e) =>
                    handleParamChange("impuesto", e.target.value)
                  }
                >
                  <option value="0">0% (Exento)</option>
                  <option value="0.15">15% (Estándar)</option>
                  <option value="0.18">18% (Turismo)</option>
                </select>
              </div>
            )}

            {camposVisibles.includes("cuotas") && (
              <div className="field">
                <label className="mdf-label">Cuotas</label>
                <select
                  className="input mdf-input mdf-input--select"
                  value={params.cuotas}
                  onChange={(e) => handleParamChange("cuotas", e.target.value)}
                >
                  <option value="1">1 (Contado)</option>
                  <option value="3">3 Meses</option>
                  <option value="6">6 Meses</option>
                  <option value="12">12 Meses</option>
                </select>
              </div>
            )}

            {camposVisibles.includes("facturaAnular") && (
              <div className="field mdf-field--full">
                <label className="mdf-label mdf-label--danger">
                  Factura a Anular (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Dejar vacío para usar JSON automático"
                  className="input mdf-input"
                  value={params.facturaAnular}
                  onChange={(e) =>
                    handleParamChange("facturaAnular", e.target.value)
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}