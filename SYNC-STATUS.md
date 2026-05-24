# Estado del Sync SYSCOM en Railway

Ultima actualizacion: 2026-05-21

## Como verificar el progreso del sync

1. Conteo rapido de productos:
   ```
   GET https://ecommerceapi-production-a587.up.railway.app/api/products?page=1&limit=1
   ```
   Ver el campo `data.total` en la respuesta JSON.

2. Estado detallado de sync (requiere admin):
   ```
   GET https://ecommerceapi-production-a587.up.railway.app/api/admin/sync/status
   Header: Authorization: Bearer <admin_jwt>
   Header: x-csrf-token: <csrf_token>
   ```

## URLs de produccion

- API: https://ecommerceapi-production-a587.up.railway.app
- Web: https://ecommerceweb-production-4cd9.up.railway.app

## Notas

- El sync se ejecuta inmediatamente al arrancar el servidor y luego cada 6 horas automaticamente.
- La API de SYSCOM limita a ~1 request/segundo, por lo que importar 13,000 productos puede tardar varias horas.
- El contador de productos ira creciendo gradualmente.
