import { useEffect } from 'react';

const AdsBar = () => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error", e);
    }
  }, []);

  return (
    <div className="w-full bg-slate-900 border-y border-slate-800 py-2 flex justify-center items-center overflow-hidden">
      <div className="text-center w-full max-w-[728px] h-[90px] bg-slate-800/50 flex flex-col justify-center items-center border border-dashed border-slate-700 rounded relative">
        <span className="text-xs text-slate-500 absolute top-1 left-2">Advertisement</span>
        
        {/* Google AdSense Insertion Code */}
        <ins className="adsbygoogle"
             style={{ display: 'inline-block', width: '728px', height: '90px' }}
             data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Replace with actual Publisher ID
             data-ad-slot="XXXXXXXXXX">               // Replace with actual Ad Slot ID
        </ins>
      </div>
    </div>
  );
};

export default AdsBar;
