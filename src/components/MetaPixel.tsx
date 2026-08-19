"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackPageView } from "@/lib/pixel";

/**
 * El pixel de Meta: lo que le permite a Instagram y Facebook saber que alguien
 * que vio un anuncio llegó al sitio. Sin él la campaña se optimiza a ciegas
 * (paga por clics) en vez de buscar gente parecida a la que sí compra.
 *
 * Va en el layout de la tienda y no en el raíz, por lo mismo que los datos
 * estructurados: en /admin no hay clientes, sólo nosotros entrando veinte veces
 * al día, y esas visitas ensuciarían los públicos que arma Meta.
 */
export default function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  // El snippet ya dispara el primer PageView al cargar. Sin esto, la primera
  // vista se contaría dos veces.
  const loaded = useRef(false);

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    // Moverse entre páginas no recarga nada (es una SPA), así que el pixel no
    // se entera solo: hay que avisarle en cada cambio de ruta.
    trackPageView();
  }, [pathname]);

  if (!pixelId) return null;

  return (
    <>
      {/* Código base tal cual lo entrega Meta: crea la cola `fbq` para que las
          llamadas hechas antes de que cargue fbevents.js no se pierdan. */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
