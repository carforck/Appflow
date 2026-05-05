/** @type {import('next').NextConfig} */
const nextConfig = {
  // output standalone genera server.js + solo los archivos necesarios
  // → imagen Docker ~60% más pequeña vs copiar node_modules completo
  output: 'standalone',

  // En desarrollo: proxy del backend a través del dev server para evitar
  // problemas de CORS y port-forwarding cuando el backend corre en el servidor remoto.
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_URL) return [];
    return [
      {
        source: '/api-proxy/:path*',
        destination: 'http://localhost:3005/:path*',
      },
    ];
  },
};

export default nextConfig;
