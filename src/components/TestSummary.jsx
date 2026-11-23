import "../styles/TestSummary.css";

export default function TestSummary({
  proyecto = "—",
  modulo = "—",
  submodulo = "—",
  escenariosTotales = 0,
  escenariosSeleccionados = 0,
  capturasTotales = 0,
  formData = {},
  onExecute,
  onCancel,
  loading = false,
}) {
  const { connection = {}, parameters = {} } = formData;
  const { ip = "127.0.0.1", port = "5000" } = connection;
  const {
    monto = "0",
    propina = "0",
    moneda = "0340",
    impuesto = "0",
    cuotas = "1",
    facturaAnular = "",
  } = parameters;

  const isAnulacion = submodulo === "ANULACION";

  const numMonto = parseFloat(String(monto).replace(",", ".")) || 0;
  const numPropina = parseFloat(String(propina).replace(",", ".")) || 0;
  const numImpuesto = parseFloat(String(impuesto).replace(",", ".")) || 0;
  const total = numMonto + numPropina + (numMonto * numImpuesto) / 100;

  const simbolo = moneda === "0340" ? "L" : "$";
  const totalFormateado = total.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="cardTestSummary">
      <aside className="ts-aside" aria-live="polite">
        <h2 className="ts-title">Resumen de la prueba</h2>

        <dl className="ts-details-list">
          <div className="ts-detail-row">
            <dt className="ts-detail-term">Flujo</dt>
            <dd className="ts-detail-value">
              {proyecto} › {modulo} › {submodulo}
            </dd>
          </div>

          <div className="ts-detail-row">
            <dt className="ts-detail-term">Escenarios</dt>
            <dd className="ts-detail-value">
              {escenariosSeleccionados} de {escenariosTotales}
            </dd>
          </div>

          <div className="ts-detail-row">
            <dt className="ts-detail-term">Capturas</dt>
            <dd className="ts-detail-value">{capturasTotales}</dd>
          </div>

          <div className="ts-detail-row">
            <dt className="ts-detail-term">Servicio</dt>
            <dd className="ts-detail-value">
              {ip}:{port}
            </dd>
          </div>

          {!isAnulacion && (
            <>
              <div className="ts-detail-row">
                <dt className="ts-detail-term">Impuesto</dt>
                <dd className="ts-detail-value">
                  {impuesto === "0" ? "Exento" : `${impuesto}%`}
                </dd>
              </div>

              <div className="ts-detail-row">
                <dt className="ts-detail-term">Cuotas</dt>
                <dd className="ts-detail-value">
                  {cuotas === "1" ? "Contado" : cuotas}
                </dd>
              </div>
            </>
          )}
        </dl>

        <div className="ts-total-row">
          <span className="ts-total-label">
            {isAnulacion ? "Factura a anular" : "Total a enviar"}
          </span>
          <strong className="ts-total-amount">
            {isAnulacion
              ? facturaAnular || "Automático"
              : `${simbolo} ${totalFormateado}`}
          </strong>
        </div>

        {!loading ? (
          <button
            type="button"
            className="ts-action-btn ts-action-btn--execute"
            onClick={onExecute}
            disabled={escenariosSeleccionados === 0}
          >
            Ejecutar {escenariosSeleccionados} escenario
            {escenariosSeleccionados !== 1 ? "s" : ""}
          </button>
        ) : (
          <button
            type="button"
            className="ts-action-btn ts-action-btn--cancel"
            onClick={onCancel}
          >
            Cancelar ejecución
          </button>
        )}
      </aside>
    </div>
  );
}