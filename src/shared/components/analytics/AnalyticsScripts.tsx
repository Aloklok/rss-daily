'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';
import { useUIStore } from '@/shared/store/uiStore';

export default function AnalyticsScripts() {
  const isAdmin = useUIStore((state) => state.isAdmin);
  const adminStatusChecked = useUIStore((state) => state.adminStatusChecked);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // 严谨逻辑：只有 [组件已挂载] 且 [管理员身份已核实完毕] 且 [确认不是管理员] 时，才加载分析脚本
  if (!mounted || !adminStatusChecked || isAdmin) {
    return null;
  }

  return (
    <>
      <SpeedInsights />
      <Analytics />

      {/* Microsoft Clarity */}
      <Script
        id="microsoft-clarity"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "ugwlylpe1l");
          `,
        }}
      />

      {/* Cloudflare Web Analytics */}
      <Script
        strategy="afterInteractive"
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon='{"token": "134bcf9865674fdd9600e9ce14992b59"}'
      />
    </>
  );
}
