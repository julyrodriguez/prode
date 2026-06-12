/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true, // Ignorar errores de linter para permitir compilar código heredado de Vite
  },
  typescript: {
    ignoreBuildErrors: true, // Ignorar errores estrictos de tipado durante la migración inicial
  },
  /* output: 'export', */ // Se puede descomentar si se quiere exportación 100% estática (HTML/CSS/JS planos)
};

export default nextConfig;
