// import { useEffect } from "react";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import { AuthProvider } from "./context/AuthContext";
// import ProtectedRoute from "./components/ProtectedRoute";
// import { PublicRoute } from "./components/PublicRoute";
// import Layout from "./components/Layout";

// import LoginPage from "./pages/LoginPage";
// import ExecuteScenarioPage from "./pages/ExecuteScenarioPage";
// import ExecutionsPage from "./pages/ExecutionsPage";
// import ScenariosAdminPage from "./pages/ScenariosAdminPage";
// import UsersAdminPage from "./pages/UsersAdminPage";
// import MatrixGeneratorPage from "./pages/MatrixGeneratorPage";
// import TicketsPage from "./pages/TicketsPage";
// import ChangePasswordPage from "./pages/ChangePassword";
// import ProfilePage from "./pages/ProfilePage";

// import "./styles/theme.css";

// function withLayout(children, { roles, anyPermissions } = {}) {
//   return (
//     <ProtectedRoute roles={roles} anyPermissions={anyPermissions}>
//       <Layout>{children}</Layout>
//     </ProtectedRoute>
//   );
// }

// export default function App() {
//   return (
//     <AuthProvider>
//       <BrowserRouter
//         future={{
//           v7_startTransition: true,
//           v7_relativeSplatPath: true,
//         }}
//       >
//         <Routes>
//           {/* Rutas públicas / cambio obligatorio de clave */}
//           <Route path="/login" element={<LoginPage />} />
//           <Route path="/cambiar-contrasena" element={<ChangePasswordPage />} />

//           {/* Rutas protegidas por permisos */}
//           <Route
//             path="/"
//             element={withLayout(<ExecuteScenarioPage />, {
//               anyPermissions: ["PRUEBAS_EJECUTAR"],
//             })}
//           />

//           <Route path="/profile" element={withLayout(<ProfilePage />)} />
          
//           <Route
//             path="/executions"
//             element={withLayout(<ExecutionsPage />, {
//               anyPermissions: [
//                 "HISTORIAL_VER_PROPIO",
//                 "HISTORIAL_VER_SQUAD",
//                 "HISTORIAL_VER_TODO",
//               ],
//             })}
//           />

//           <Route
//             path="/matrix"
//             element={withLayout(<MatrixGeneratorPage />, {
//               anyPermissions: ["MATRIZ_VER"],
//             })}
//           />

//           {/* Gestión de tickets: accesible para todos los usuarios autenticados */}
//           <Route path="/tickets" element={withLayout(<TicketsPage />)} />

//           <Route
//             path="/scenarios"
//             element={withLayout(<ScenariosAdminPage />, {
//               roles: ["ADMIN"],
//               anyPermissions: ["CATALOGO_GESTIONAR"],
//             })}
//           />

//           <Route
//             path="/users"
//             element={withLayout(<UsersAdminPage />, {
//               roles: ["ADMIN"],
//               anyPermissions: ["USUARIOS_GESTIONAR"],
//             })}
//           />
//         </Routes>
//       </BrowserRouter>
//     </AuthProvider>
//   );
// }

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ExecuteScenarioPage from "./pages/ExecuteScenarioPage";
import ExecutionsPage from "./pages/ExecutionsPage";
import ScenariosAdminPage from "./pages/ScenariosAdminPage";
import UsersAdminPage from "./pages/UsersAdminPage";
import MatrixGeneratorPage from "./pages/MatrixGeneratorPage";
import TicketsPage from "./pages/TicketsPage";
import ChangePasswordPage from "./pages/ChangePassword";
import ProfilePage from "./pages/ProfilePage";

import "./styles/theme.css";

function withLayout(children, { roles, anyPermissions } = {}) {
  return (
    <ProtectedRoute roles={roles} anyPermissions={anyPermissions}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* Rutas públicas / cambio obligatorio de clave */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cambiar-contrasena" element={<ChangePasswordPage />} />

          {/* Dashboard general (accesible para todos los usuarios autenticados) */}
          <Route path="/" element={withLayout(<DashboardPage />)} />

          {/* Perfil del usuario (accesible para todos los roles) */}
          <Route path="/profile" element={withLayout(<ProfilePage />)} />

          {/* Rutas protegidas por permisos */}
          <Route
            path="/executescenario"
            element={withLayout(<ExecuteScenarioPage />, {
              anyPermissions: ["PRUEBAS_EJECUTAR"],
            })}
          />

          <Route
            path="/executions"
            element={withLayout(<ExecutionsPage />, {
              anyPermissions: [
                "HISTORIAL_VER_PROPIO",
                "HISTORIAL_VER_SQUAD",
                "HISTORIAL_VER_TODO",
              ],
            })}
          />

          <Route
            path="/matrix"
            element={withLayout(<MatrixGeneratorPage />, {
              anyPermissions: ["MATRIZ_VER"],
            })}
          />

          {/* Gestión de tickets: accesible para todos los usuarios autenticados */}
          <Route path="/tickets" element={withLayout(<TicketsPage />)} />

          <Route
            path="/scenarios"
            element={withLayout(<ScenariosAdminPage />, {
              roles: ["ADMIN"],
              anyPermissions: ["CATALOGO_GESTIONAR"],
            })}
          />

          <Route
            path="/users"
            element={withLayout(<UsersAdminPage />, {
              roles: ["ADMIN"],
              anyPermissions: ["USUARIOS_GESTIONAR"],
            })}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}