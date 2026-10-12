'use client';
import Script from 'next/script';
import {useCallback,useEffect,useRef,useState} from 'react';
type TurnstileApi={
  render:(element:HTMLElement,options:Record<string,unknown>)=>string;
  remove:(id:string)=>void;
  reset:(id:string)=>void;
};
declare global {interface Window {turnstile?:TurnstileApi}}

export default function TurnstileWidget({resetVersion,onToken}:{resetVersion:number;onToken:(token:string)=>void}){
  const container=useRef<HTMLDivElement>(null);const widget=useRef<string|null>(null);
  const callback=useRef(onToken);callback.current=onToken;
  const [failed,setFailed]=useState(false);
  const sitekey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const render=useCallback(()=>{
    if(!sitekey||!container.current||!window.turnstile||widget.current!==null)return;
    widget.current=window.turnstile.render(container.current,{
      sitekey,action:'lead',theme:'auto',size:'flexible','response-field':false,
      callback:(token:string)=>{setFailed(false);callback.current(token)},
      'expired-callback':()=>{callback.current('');if(widget.current!==null)window.turnstile?.reset(widget.current)},
      'error-callback':()=>{callback.current('');setFailed(true)},
    });
  },[sitekey]);
  useEffect(()=>{render();return()=>{if(widget.current!==null){window.turnstile?.remove(widget.current);widget.current=null}}},[render]);
  useEffect(()=>{if(resetVersion>0){callback.current('');setFailed(false);if(widget.current!==null)window.turnstile?.reset(widget.current)}},[resetVersion]);
  if(!sitekey)return null;
  return <><Script id="turnstile-api" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={render} onError={()=>setFailed(true)}/><div ref={container} className="turnstile-widget"/>{failed&&<p className="caption" role="status">Перевірка захисту тимчасово недоступна. Оновіть сторінку перед надсиланням.</p>}</>;
}
