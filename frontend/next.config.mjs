/** @type {import('next').NextConfig} */
const nextConfig = {
  // output standalone genera server.js + solo los archivos necesarios
  // → imagen Docker ~60% más pequeña vs copiar node_modules completo
  output: 'standalone',
};

export default nextConfig;
