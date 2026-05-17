import { v2 as cloudinary } from 'cloudinary';
import type { FastifyInstance } from 'fastify';
import { logAdminAction } from '../modules/admin/audit.service';

/**
 * Servicio de subida de imágenes a Cloudinary.
 * Valida tipo, tamaño y dimensiones antes de subir.
 */

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_DIMENSION = 400;

interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Inicializa Cloudinary con las variables de entorno.
 */
export function initCloudinary(app: FastifyInstance): void {
  const env = app.config;

  if (env.CLOUDINARY_URL) {
    // Usa la URL completa de Cloudinary
    cloudinary.config({
      secure: true,
    });
  } else if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  } else {
    app.log.warn('Cloudinary no configurado. Las subidas de imagen no funcionarán.');
  }
}

/**
 * Valida y sube una imagen a Cloudinary.
 */
export async function uploadImage(
  app: FastifyInstance,
  buffer: Buffer,
  filename: string,
  mimeType: string,
  adminId: string,
  ipAddress?: string
): Promise<UploadResult> {
  // 1. Validar tipo de archivo
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Tipo de archivo no permitido: ${mimeType}. Solo se permiten JPEG, PNG y WebP.`);
  }

  // 2. Validar tamaño
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`El archivo excede el tamaño máximo de 5MB.`);
  }

  // 3. Sanitizar nombre de archivo
  const safeFilename = sanitizeFilename(filename);

  // 4. Subir a Cloudinary
  const result = await new Promise<cloudinary.UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'ecommerce/products',
        public_id: safeFilename.replace(/\.[^/.]+$/, ''), // Quitar extensión
        overwrite: false,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Error al subir imagen a Cloudinary'));
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });

  // 5. Validar dimensiones mínimas (Cloudinary devuelve width/height)
  if (result.width < MIN_DIMENSION || result.height < MIN_DIMENSION) {
    // Eliminar la imagen subida si no cumple dimensiones
    await cloudinary.uploader.destroy(result.public_id);
    throw new Error(
      `Las dimensiones de la imagen (${result.width}x${result.height}) son menores al mínimo requerido (${MIN_DIMENSION}x${MIN_DIMENSION}px).`
    );
  }

  // 6. Registrar en audit log
  await logAdminAction(
    adminId,
    'UPLOAD_IMAGE',
    'product',
    result.public_id,
    null,
    { url: result.secure_url, publicId: result.public_id, format: result.format },
    ipAddress
  );

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  };
}

/**
 * Sanitiza el nombre de archivo para prevenir path traversal y caracteres especiales.
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\\/g, '/') // Normalizar separadores
    .split('/').pop() ?? 'upload' // Eliminar path traversal
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Reemplazar caracteres especiales
    .replace(/_{2,}/g, '_') // Colapsar guiones bajos múltiples
    .substring(0, 100); // Limitar longitud
}
