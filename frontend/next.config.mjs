/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Headers de seguridad base a nivel de plataforma.
  // La política CORS real hacia el backend se controla en el proxy Fastify
  // (ver backend/src/plugins/security.ts), no aquí.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
