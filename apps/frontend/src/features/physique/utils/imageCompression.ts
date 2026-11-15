/**
 * Comprime uma imagem selecionada no client-side via <canvas> (máx 1024px, JPEG 0.8),
 * respeitando a orientação EXIF original via createImageBitmap({ imageOrientation: 'from-image' })
 * e preservando estritamente a proporção naturalWidth / naturalHeight sem cortes ou estiramentos.
 */
function calculateAspectPreservingDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxDimension: number
): { width: number; height: number } {
  if (naturalWidth <= maxDimension && naturalHeight <= maxDimension) {
    return {
      width: Math.max(1, Math.round(naturalWidth)),
      height: Math.max(1, Math.round(naturalHeight)),
    };
  }

  const aspectRatio = naturalWidth / naturalHeight;
  if (naturalWidth >= naturalHeight) {
    const width = maxDimension;
    const height = Math.max(1, Math.round(maxDimension / aspectRatio));
    return { width, height };
  }

  const height = maxDimension;
  const width = Math.max(1, Math.round(maxDimension * aspectRatio));
  return { width, height };
}

export async function compressImageToBase64(
  file: File,
  maxDimension = 1024,
  quality = 0.8
): Promise<{ base64: string; mimeType: 'image/jpeg' }> {
  let bitmap: ImageBitmap | null = null;
  let objectUrl: string | null = null;

  try {
    let source: CanvasImageSource;
    let naturalWidth: number;
    let naturalHeight: number;

    if (typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        source = bitmap;
        naturalWidth = bitmap.width;
        naturalHeight = bitmap.height;
      } catch {
        bitmap = null;
        objectUrl = URL.createObjectURL(file);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () =>
            reject(new Error('Não foi possível carregar a imagem selecionada.'));
          image.src = objectUrl!;
        });
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
        source = img;
        naturalWidth = img.naturalWidth || img.width;
        naturalHeight = img.naturalHeight || img.height;
      }
    } else {
      objectUrl = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () =>
          reject(new Error('Não foi possível carregar a imagem selecionada.'));
        image.src = objectUrl!;
      });
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
      source = img;
      naturalWidth = img.naturalWidth || img.width;
      naturalHeight = img.naturalHeight || img.height;
    }

    const { width, height } = calculateAspectPreservingDimensions(
      naturalWidth,
      naturalHeight,
      maxDimension
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Contexto 2D indisponível para compressão de imagem.');
    }

    ctx.drawImage(source, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    // Limpa o canvas da memória imediatamente
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;

    const commaIndex = dataUrl.indexOf(',');
    const base64 = commaIndex !== -1 ? dataUrl.slice(commaIndex + 1) : dataUrl;

    return {
      base64,
      mimeType: 'image/jpeg',
    };
  } finally {
    if (bitmap && typeof bitmap.close === 'function') {
      bitmap.close();
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
