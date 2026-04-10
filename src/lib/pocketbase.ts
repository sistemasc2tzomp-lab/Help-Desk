import PocketBase from 'pocketbase';

// En producción (GitHub Pages), esta variable DEBE ser configurada en los Secrets del repositorio.
// Si no se proporciona, el sistema intentará conectar a localhost (solo para desarrollo).
const PB_URL = import.meta.env.VITE_PB_URL || 'http://172.23.224.1:8090';

export const pb = new PocketBase(PB_URL);

// Función para verificar si podemos conectar al servidor
export async function isPocketBaseOnline(): Promise<boolean> {
    try {
        const resp = await fetch(`${PB_URL}/api/health`, { 
            method: 'GET',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' }
        });
        return resp.ok;
    } catch (error) {
        console.warn('PocketBase Nexo Offline:', PB_URL);
        return false;
    }
}

// Helpers para manejo de archivos (avatares, imágenes de tickets)
export function getFileUrl(collectionId: string, recordId: string, fileName: string) {
    if (!fileName) return null;
    return `${PB_URL}/api/files/${collectionId}/${recordId}/${fileName}`;
}

export function isPocketBaseConfigured(): boolean {
    return PB_URL !== 'http://127.0.0.1:8090' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}
