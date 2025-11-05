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
    .swagger-ui .auth-wrapper { margin: 20px 0; }
    .swagger-ui .authorize-wrapper { padding: 10px; }
    .swagger-ui .btn.authorize { 
      background: #4f46e5; 
      border-color: #4f46e5; 
      color: white;
      font-weight: 600;
    }
    .swagger-ui .btn.authorize:hover { 
      background: #3730a3; 
      border-color: #3730a3; 
    }
    .swagger-ui .auth-container .auth-wrapper:first-child { border-top: none; }
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
      persistAuthorization: true,
      requestInterceptor: function(request) {
        // Get authorization token from localStorage
        const token = localStorage.getItem('swagger-bearer-token');
        if (token) {
          request.headers['Authorization'] = 'Bearer ' + token;
        }
        return request;
      },
      onComplete: function() {
        console.log('Swagger UI loaded successfully');
        
        // Add custom authorization button
        setTimeout(() => {
          const topbar = document.querySelector('.swagger-ui');
          if (topbar && !document.querySelector('#custom-auth-btn')) {
            const authContainer = document.createElement('div');
            authContainer.innerHTML = \`
              <div style="padding: 20px; background: #f7f7f7; border-bottom: 1px solid #ddd; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px;">Authorization</h3>
                <div style="display: flex; gap: 10px; align-items: center;">
                  <input type="text" id="bearer-token-input" placeholder="Enter Bearer Token" 
                         style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;"
                         value="\${localStorage.getItem('swagger-bearer-token') || ''}" />
                  <button id="custom-auth-btn" onclick="setAuthToken()" 
                          style="padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Authorize
                  </button>
                  <button onclick="clearAuthToken()" 
                          style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Clear
                  </button>
                </div>
                <div id="auth-status" style="margin-top: 8px; font-size: 12px; color: #666;"></div>
              </div>
            \`;
            topbar.insertBefore(authContainer, topbar.firstChild);
          }
        }, 500);
      },
      onFailure: function(data) {
        console.error('Failed to load OpenAPI spec:', data);
      }
    });
    
    // Custom authorization functions
    window.setAuthToken = function() {
      const token = document.getElementById('bearer-token-input').value.trim();
      if (token) {
        localStorage.setItem('swagger-bearer-token', token);
        document.getElementById('auth-status').innerHTML = '<span style="color: green;">✓ Token set successfully</span>';
      } else {
        alert('Please enter a valid token');
      }
    };
    
    window.clearAuthToken = function() {
      localStorage.removeItem('swagger-bearer-token');
      document.getElementById('bearer-token-input').value = '';
      document.getElementById('auth-status').innerHTML = '<span style="color: orange;">Token cleared</span>';
    };
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
