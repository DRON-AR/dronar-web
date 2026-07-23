import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// eslint-config-next@16 ya exporta un array de flat config nativo — se
// importa directo en vez de pasar por FlatCompat (que intenta convertir
// el formato legado .eslintrc y falla con un error de referencia
// circular contra esta versión del paquete).
const eslintConfig = [...nextCoreWebVitals];

export default eslintConfig;
