import type { MetadataRoute } from 'next'
import { siteUrl } from '@/config/clinic'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Anything that can hold a token or staff data stays out of search.
      disallow: ['/api/', '/admin', '/manage', '/feedback'],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
