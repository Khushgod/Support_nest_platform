/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep native / Node-only modules external to the server bundle so webpack
    // doesn't mangle them (better-sqlite3 native; pdf-parse/mammoth use pdfjs/fs).
    serverComponentsExternalPackages: ['better-sqlite3', 'pdf-parse', 'mammoth'],
  },
};

module.exports = nextConfig;
