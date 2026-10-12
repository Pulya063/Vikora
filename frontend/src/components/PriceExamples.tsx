'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {apiUrl,legacyBackend,publicPaths} from '@/lib/publicApi';
import {calculateEstimate,parsePublicPrices,type PublicPrices} from '@/lib/pricing';
import {money} from '@/lib/data';
import type {Configuration} from '@/lib/types';
const Context=createContext<{prices:PublicPrices|null;failed:boolean}>({prices:null,failed:false});
export function PriceExamples({children}:{children:React.ReactNode}){
  const [state,setState]=useState<{prices:PublicPrices|null;failed:boolean}>({prices:null,failed:false});
  useEffect(()=>{
    if(legacyBackend)return;
    let stopped=false;let pending:AbortController|null=null;
    async function refresh(){
      if(pending)return;
      const controller=new AbortController();pending=controller;
      const timeout=setTimeout(()=>controller.abort(),5000);
      try{
        const response=await fetch(apiUrl(publicPaths.prices),{cache:'no-store',signal:controller.signal});
        if(!response.ok)throw new Error('prices_unavailable');
        const prices=parsePublicPrices(await response.json());
        if(!stopped)setState({prices,failed:false});
      }catch{if(!stopped)setState({prices:null,failed:true})}
      finally{clearTimeout(timeout);pending=null}
    }
    void refresh();const interval=setInterval(()=>{if(document.visibilityState!=='hidden')void refresh()},60000);
    return()=>{stopped=true;pending?.abort();clearInterval(interval)};
  },[]);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function SamplePrice({profile,dimensions,sections,legacyPrice}:{profile:string;dimensions:string;sections:number;legacyPrice:number}){
  const {prices,failed}=useContext(Context);
  if(legacyBackend)return <p>ціна від <strong>{money(legacyPrice)} грн</strong></p>;
  if(!prices)return <p aria-live="polite">{failed?'Ціну уточнить менеджер':'Оновлюємо ціну…'}</p>;
  try{
    const [width_mm,height_mm]=dimensions.match(/\d+/g)!.map(Number);
    const configuration:Configuration={product_type:'window',profile,dimensions:{width_mm,height_mm},construction:sections===1?'single':sections===2?'double':'triple',sections,opening:Array.from({length:sections},(_,i)=>i===Math.min(1,sections-1)?'tilt_turn':'fixed'),glass_unit:'energy_saving',color:'white',extras:[],services_requested:{delivery:false,installation:false}};
    const estimate=calculateEstimate(configuration,prices);
    return <p>орієнтовно <strong>{money(estimate.estimated_product_price_uah)} грн</strong></p>;
  }catch{return <p>Ціну уточнить менеджер</p>}
}
