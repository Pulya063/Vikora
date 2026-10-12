'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {apiUrl,emptyContacts,parsePublicContacts,publicPaths,type ContactsSnapshot} from '@/lib/publicApi';
const Context=createContext<ContactsSnapshot>({contacts:emptyContacts,stale:true,fetchedAt:0});
export const usePublicContacts=()=>useContext(Context);
export default function ContactsProvider({initial,children}:{initial:ContactsSnapshot;children:React.ReactNode}) {
  const [snapshot,setSnapshot]=useState(initial);
  useEffect(()=>{
    let stopped=false;let pending:AbortController|null=null;
    async function refresh(){
      if(pending||document.visibilityState==='hidden')return;
      const controller=new AbortController();pending=controller;
      const timeout=setTimeout(()=>controller.abort(),5000);
      try{
        const response=await fetch(apiUrl(publicPaths.contacts),{cache:'no-store',signal:controller.signal});
        if(!response.ok)throw new Error('contacts_unavailable');
        const contacts=parsePublicContacts(await response.json());
        if(!stopped)setSnapshot({contacts,stale:false,fetchedAt:Date.now()});
      }catch{if(!stopped)setSnapshot(old=>({contacts:Date.now()-old.fetchedAt<120000?old.contacts:emptyContacts,stale:true,fetchedAt:old.fetchedAt}));}
      finally{clearTimeout(timeout);pending=null;}
    }
    if(initial.stale||Date.now()-initial.fetchedAt>=60000)void refresh();
    const interval=setInterval(()=>{void refresh()},60000);
    const onVisible=()=>{void refresh()};
    document.addEventListener('visibilitychange',onVisible);window.addEventListener('focus',onVisible);
    return()=>{stopped=true;pending?.abort();clearInterval(interval);document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('focus',onVisible)};
  },[initial.fetchedAt,initial.stale]);
  return <Context.Provider value={snapshot}>{children}</Context.Provider>;
}
