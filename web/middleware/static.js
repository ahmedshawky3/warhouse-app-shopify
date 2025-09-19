// @ts-nocheck
import serveStatic from "serve-static";

/**
 * Configure static file serving
 */
export const configureStaticFiles = (staticPath) => {
  return serveStatic(staticPath, { 
    index: false,
    setHeaders: (res, path) => {
      // Set proper headers for different file types
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (path.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html');
      }
    }
  });
};
