import { prisma } from '../../lib/prisma';

/**
 * Servicio de direcciones del usuario.
 * Límite máximo: 5 direcciones por usuario.
 */

const MAX_ADDRESSES = 5;

/**
 * Lista las direcciones del usuario.
 */
export async function getUserAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Obtiene una dirección específica del usuario.
 */
export async function getAddressById(addressId: string, userId: string) {
  return prisma.address.findFirst({
    where: { id: addressId, userId },
  });
}

/**
 * Crea una nueva dirección.
 * Verifica límite de 5 direcciones.
 * Si isDefault=true, desmarca otras direcciones como default.
 */
export async function createAddress(
  userId: string,
  data: {
    label: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault?: boolean;
  }
): Promise<{ success: boolean; address?: unknown; error?: string }> {
  // Verificar límite
  const count = await prisma.address.count({ where: { userId } });
  if (count >= MAX_ADDRESSES) {
    return {
      success: false,
      error: `Has alcanzado el límite máximo de ${MAX_ADDRESSES} direcciones.`,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    // Si es default, desmarcar las demás
    if (data.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Si es la primera dirección, forzar como default
    const shouldBeDefault = data.isDefault || count === 0;

    const address = await tx.address.create({
      data: {
        userId,
        label: data.label as 'HOME' | 'OFFICE' | 'OTHER',
        street: data.street,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        isDefault: shouldBeDefault,
      },
    });

    return address;
  });

  return { success: true, address: result };
}

/**
 * Actualiza una dirección.
 * Verifica propiedad del usuario.
 * Si isDefault=true, desmarca otras.
 */
export async function updateAddress(
  addressId: string,
  userId: string,
  data: Partial<{
    label: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
  }>
): Promise<{ success: boolean; address?: unknown; error?: string }> {
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });

  if (!existing) {
    return { success: false, error: 'Dirección no encontrada.' };
  }

  const result = await prisma.$transaction(async (tx) => {
    // Si se está marcando como default, desmarcar las demás
    if (data.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const address = await tx.address.update({
      where: { id: addressId },
      data,
    });

    return address;
  });

  return { success: true, address: result };
}

/**
 * Elimina una dirección.
 * Verifica propiedad del usuario.
 * Si se elimina la dirección default, marca otra como default.
 */
export async function deleteAddress(
  addressId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });

  if (!existing) {
    return { success: false, error: 'Dirección no encontrada.' };
  }

  const wasDefault = existing.isDefault;

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({
      where: { id: addressId },
    });

    // Si era la default, marcar la primera restante como default
    if (wasDefault) {
      const firstRemaining = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      if (firstRemaining) {
        await tx.address.update({
          where: { id: firstRemaining.id },
          data: { isDefault: true },
        });
      }
    }
  });

  return { success: true };
}
