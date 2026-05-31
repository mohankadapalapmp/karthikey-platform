export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/profile', '/org', '/credits', '/api'],
      },
    ],
    sitemap: 'https://agents.karthikey.in/sitemap.xml',
  }
}
