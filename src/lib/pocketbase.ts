import PocketBase from 'pocketbase';

const PB_URL = import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090';

export const pb = new PocketBase(PB_URL);

// Función para verificar si podemos conectar
export async function isPocketBaseOnline(): Promise<boolean> {
    try {
        const resp = await fetch(`${PB_URL}/api/health`);
        return resp.ok;
    } catch {
        return false;
    }
}

// Helpers para manejo de archivos (avatares, imágenes de tickets)
export function getFileUrl(collectionId: string, recordId: string, fileName: string) {
    if (!fileName) return null;
    return `${PB_URL}/api/files/${collectionId}/${recordId}/${fileName}`;
}

export function isPocketBaseConfigured(): boolean {
    return true; // For now always true, we use the hardcoded URL
}
