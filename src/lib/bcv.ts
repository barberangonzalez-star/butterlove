export interface BcvRate {
  rate: number;
  updatedAt: string;
}

export interface BcvRates {
  usd: BcvRate | null;
  eur: BcvRate | null;
}

async function fetchRate(path: string): Promise<BcvRate | null> {
  try {
    const res = await fetch(`https://ve.dolarapi.com/v1/${path}`, {
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

export async function getBcvRate(): Promise<BcvRate | null> {
  return fetchRate("dolares/oficial");
}

export async function getBcvRates(): Promise<BcvRates> {
  const [usd, eur] = await Promise.all([
    fetchRate("dolares/oficial"),
    fetchRate("euros/oficial"),
  ]);
  return { usd, eur };
}
