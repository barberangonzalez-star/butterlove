export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("bad response");
    const data = await res.json();
    const rate = Number(data.promedio);
    if (!rate) throw new Error("no rate");
    return Response.json({ rate, updatedAt: data.fechaActualizacion as string });
  } catch {
    return Response.json({ rate: null, updatedAt: null }, { status: 502 });
  }
}
