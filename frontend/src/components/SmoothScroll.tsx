'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

const WHEEL_STEP=100;
const SETTLE_TIME=105;

function hasScrollableParent(target:EventTarget|null){
 let element=target instanceof HTMLElement?target.parentElement:null;
 while(element&&element!==document.body){
  const style=getComputedStyle(element);
  if(/auto|scroll/.test(style.overflowY)&&element.scrollHeight>element.clientHeight+2)return true;
  element=element.parentElement;
 }
 return false;
}

export default function SmoothScroll(){
 const pathname=usePathname();

 useEffect(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer=window.matchMedia('(pointer: fine)');
  if(reduced.matches||!finePointer.matches)return;

  let targetY=window.scrollY;
  let currentY=window.scrollY;
  let frame=0;
  let lastFrame=performance.now();
  let lastWheel=0;
  let direction=0;
  let streak=0;

  const maximum=()=>Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
  const animate=(now:number)=>{
   const elapsed=Math.min(32,now-lastFrame);
   lastFrame=now;
   const blend=1-Math.exp(-elapsed/SETTLE_TIME);
   currentY+= (targetY-currentY)*blend;
   if(Math.abs(targetY-currentY)<.35){
    currentY=targetY;
    window.scrollTo({top:currentY,behavior:'instant' as ScrollBehavior});
    frame=0;
    return;
   }
   window.scrollTo({top:currentY,behavior:'instant' as ScrollBehavior});
   frame=requestAnimationFrame(animate);
  };

  const onWheel=(event:WheelEvent)=>{
   if(event.defaultPrevented||event.ctrlKey||event.metaKey||hasScrollableParent(event.target))return;
   let delta=event.deltaY;
   if(event.deltaMode===1)delta*=40;
   if(event.deltaMode===2)delta*=window.innerHeight;
   if(!delta||Math.abs(delta)<50)return;

   event.preventDefault();
   const now=performance.now();
   const nextDirection=Math.sign(delta);
   if(now-lastWheel<80&&nextDirection===direction)streak=Math.min(streak+1,4);
   else streak=0;
   lastWheel=now;
   direction=nextDirection;

   const normalized=nextDirection*Math.min(150,Math.max(WHEEL_STEP,Math.abs(delta)*.84));
   const acceleration=1+streak*.12;
   if(!frame){currentY=window.scrollY;targetY=currentY;lastFrame=now}
   targetY=Math.min(maximum(),Math.max(0,targetY+normalized*acceleration));
   if(!frame)frame=requestAnimationFrame(animate);
  };

  const sync=()=>{if(!frame){currentY=window.scrollY;targetY=currentY}};
  window.addEventListener('wheel',onWheel,{passive:false});
  window.addEventListener('scroll',sync,{passive:true});
  return()=>{
   window.removeEventListener('wheel',onWheel);
   window.removeEventListener('scroll',sync);
   if(frame)cancelAnimationFrame(frame);
  };
 },[pathname]);

 return null;
}
