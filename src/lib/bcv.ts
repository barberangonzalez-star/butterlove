export interface BcvRate {
  rate: number;
  updatedAt: string;
}

export async function getBcvRate(): Promise<BcvRate | null> {
  try {
    const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = Number(data.promedio);
    if (!rate) return null;
    return { rate, updatedAt: data.fechaActualizacion as string };
  } catch {
    return null;
  }
}
