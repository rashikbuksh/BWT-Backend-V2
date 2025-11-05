import env from '@/env';

import type { AppOpenAPI } from './types';

import packageJSON from '../../package.json' with { type: 'json' };

export function configureOpenAPI(app: AppOpenAPI, openapiPath = '/reference', docPath = '/doc') {
  app.doc(docPath, {
    openapi: '3.0.0',
    info: {
      title: packageJSON.name,
      description: 'BWT API Documentation',
      contact: { name: 'RBR', email: 'rafsan@fortunezip.com' },
      version: packageJSON.version,
    },
    servers: [
      { url: env.SERVER_URL, description: 'Dev' },
      { url: env.PRODUCTION_URL, description: 'Prod' },
      { url: env.PRODUCTION_URL_2, description: 'Local' },
    ],

  });

  // Use Swagger UI instead of Scalar to avoid digest error
  app.get(
    `${openapiPath}`,
    (c) => {
      return c.html(`
<!DOCTYPE html>
<html>
<head>
  <title>API Documentation - ${packageJSON.name}</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; }
    .header { background: #1f2937; color: white; padding: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 5px 0 0 0; opacity: 0.8; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${packageJSON.name} API Documentation</h1>
    <p>Version ${packageJSON.version}</p>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    SwaggerUIBundle({
      url: '${docPath}',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset
      ],
      plugins: [
        SwaggerUIBundle.plugins.DownloadUrl
      ],
      layout: "StandaloneLayout",
      tryItOutEnabled: true,
      filter: true,
      supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'],
      onComplete: function() {
        console.log('Swagger UI loaded successfully');
      },
      onFailure: function(data) {
        console.error('Failed to load OpenAPI spec:', data);
      }
    });
  </script>
</body>
</html>
      `);
    },
  );

  // Add alternative route for raw OpenAPI JSON with CORS headers
  app.get('/openapi.json', (c) => {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET');
    c.header('Access-Control-Allow-Headers', 'Content-Type');
    return c.redirect(docPath);
  });
}

// import env from '@/env';
// import { Scalar } from '@scalar/hono-api-reference';

// import type { AppOpenAPI } from './types';

// import packageJSON from '../../package.json' with { type: 'json' };

// export function configureOpenAPI(app: AppOpenAPI, openapiPath = '/reference', docPath = '/doc') {
//   app.doc(docPath, {
//     openapi: '3.0.0',
//     info: {
//       title: packageJSON.name,
//       description: 'BWT API Documentation',
//       contact: { name: 'RBR', email: 'rafsan@fortunezip.com' },
//       version: packageJSON.version,
//     },
//     servers: [
//       { url: env.SERVER_URL, description: 'Dev' },
//       { url: env.PRODUCTION_URL, description: 'Prod' },
//       { url: env.PRODUCTION_URL_2, description: 'Local' },
//     ],

//   });

//   app.get(
//     `${openapiPath}`,
//     Scalar({
//       url: `${docPath}`,
//       theme: 'deepSpace',
//       pageTitle: packageJSON.name,
//       layout: 'modern', // modern, classic
//       defaultHttpClient: {
//         targetKey: 'js',
//         clientKey: 'fetch',
//       },
//       hideDownloadButton: true,
//       hiddenClients: true,
//     }),
//   );
// }
