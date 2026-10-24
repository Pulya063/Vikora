'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

const WHEEL_STEP=100;
const SETTLE_TIME=105;
const MOUSE_WHEEL_MIN=50;

function hasScrollableParent(target:EventTarget|null){
 let element=target instanceof HTMLElement?target.parentElement:null;
 while(element&&element!==document.body){
  const style=getComputedStyle(element);
  if(/auto|scroll/.test(style.overflowY)&&element.scrollHeight>element.clientHeight+2)return true;
  element=element.parentElement;
 }
 return false;
}

/**
 * Eased scrolling for classic mouse wheels only.
 * Trackpads (small deltas), keyboard, scrollbar, anchors and touch keep native scrolling.
 */
export default function SmoothScroll(){
 const pathname=usePathname();

 useEffect(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer=window.matchMedia('(pointer: fine)');
  if(reduced.matches||!finePointer.matches)return;

  let targetY=window.scrollY;
  let currentY=window.scrollY;
  let writtenY=window.scrollY;
  let frame=0;
  let lastFrame=performance.now();
  let lastWheel=0;
  let direction=0;
  let streak=0;

  const maximum=()=>Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
  const clamp=(value:number)=>Math.min(maximum(),Math.max(0,value));
  const write=(y:number)=>{writtenY=Math.round(y);window.scrollTo({top:y,behavior:'instant' as ScrollBehavior})};

  // Stop our animation and adopt the real position (another input took over).
  const stop=()=>{
   if(frame)cancelAnimationFrame(frame);
   frame=0;
   currentY=targetY=window.scrollY;
   streak=0;
  };

  const animate=(now:number)=>{
   const elapsed=Math.min(32,now-lastFrame);
   lastFrame=now;
   targetY=clamp(targetY);
   const blend=1-Math.exp(-elapsed/SETTLE_TIME);
   currentY+=(targetY-currentY)*blend;
   if(Math.abs(targetY-currentY)<.5){
    currentY=targetY;
    write(currentY);
    frame=0;
    return;
   }
   write(currentY);
   frame=requestAnimationFrame(animate);
  };

  const onWheel=(event:WheelEvent)=>{
   if(reduced.matches)return;
   if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||hasScrollableParent(event.target)){stop();return}
   let delta=event.deltaY;
   if(event.deltaMode===1)delta*=40;
   if(event.deltaMode===2)delta*=window.innerHeight;
   if(!delta)return;
   // Trackpad / precise wheel: hand control back to the browser immediately.
   if(Math.abs(delta)<MOUSE_WHEEL_MIN){if(frame)stop();return}

   event.preventDefault();
   const now=performance.now();
   const nextDirection=Math.sign(delta);

   if(!frame){currentY=targetY=window.scrollY;lastFrame=now}

   if(nextDirection!==direction){
    // Reversal: drop the momentum still queued in the old direction,
    // otherwise the page keeps moving the wrong way and feels "stuck".
    targetY=currentY;
    streak=0;
   }else if(now-lastWheel<80){
    streak=Math.min(streak+1,4);
   }else{
    streak=0;
   }
   lastWheel=now;
   direction=nextDirection;

   const step=nextDirection*Math.min(150,Math.max(WHEEL_STEP,Math.abs(delta)*.84))*(1+streak*.12);
   // Never queue more than ~1.5 viewports ahead of the visible position.
   const lead=window.innerHeight*1.5;
   targetY=clamp(Math.min(currentY+lead,Math.max(currentY-lead,targetY+step)));
   if(!frame)frame=requestAnimationFrame(animate);
  };

  // Scroll that we did not write (scrollbar drag, keyboard, anchor link, find-in-page).
  const onScroll=()=>{
   if(!frame){currentY=targetY=window.scrollY;return}
   if(Math.abs(window.scrollY-writtenY)>2)stop();
  };
  const onKey=(event:KeyboardEvent)=>{
   if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Space'].includes(event.key))stop();
  };
  const onPointerDown=()=>{if(frame)stop()};

  window.addEventListener('wheel',onWheel,{passive:false});
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('keydown',onKey);
  window.addEventListener('pointerdown',onPointerDown,{passive:true});
  const onMotionChange=()=>{if(reduced.matches)stop()};
  reduced.addEventListener('change',onMotionChange);
  return()=>{
   window.removeEventListener('wheel',onWheel);
   window.removeEventListener('scroll',onScroll);
   window.removeEventListener('keydown',onKey);
   window.removeEventListener('pointerdown',onPointerDown);
   reduced.removeEventListener('change',onMotionChange);
   if(frame)cancelAnimationFrame(frame);
  };
 },[pathname]);

 return null;
}
