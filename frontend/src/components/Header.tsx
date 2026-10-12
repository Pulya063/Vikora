'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Mail,Menu,MessageCircle,Phone,Send,X} from 'lucide-react';
import {business,navigation} from '@/lib/data';
import {usePublicContacts} from './ContactsProvider';
export function Logo(){return <Link href="/" className="logo" aria-label="VIKORA — головна">VIKORA<span>ВІКНА ТА ДВЕРІ</span></Link>}
export default function Header(){
 const {contacts}=usePublicContacts();
 const path=usePathname(); const [open,setOpen]=useState(false);const ref=useRef<HTMLDialogElement>(null);
 const phone=contacts.phone;const phoneLabel=phone||(business.phonePlaceholder as string);
 useEffect(()=>{setOpen(false)},[path]);
 useEffect(()=>{if(open)ref.current?.showModal();else ref.current?.close();document.body.style.overflow=open?'hidden':'';return()=>{document.body.style.overflow=''}},[open]);
 const phoneHref=phone?`tel:${phone.replace(/[^+\d]/g,'')}`:undefined;
 return <><a className="skip" href="#main">До вмісту</a><header className={`header ${path==='/'?'over-hero':''}`}><Logo/><nav aria-label="Головна навігація">{navigation.map(([n,h])=><Link key={h} href={h} aria-current={path===h?'page':undefined}>{n}</Link>)}</nav>{phone?<a className="header-phone" href={phoneHref}><Phone size={15}/>{phoneLabel}</a>:<span className="header-phone is-placeholder"><Phone size={15}/>{phoneLabel}</span>}<Link className="button header-cta" href="/calculator">Розрахувати вартість <ArrowUpRight size={16}/></Link><button className="menu-toggle" aria-label="Відкрити меню" aria-expanded={open} onClick={()=>setOpen(true)}><Menu/></button></header><nav className="contact-rail" aria-label="Швидкий зв’язок">{contacts.telegram&&<a href={contacts.telegram} aria-label="Написати у Telegram"><Send size={18}/><span>Telegram</span></a>}{contacts.viber&&<a href={contacts.viber} aria-label="Написати у Viber"><MessageCircle size={18}/><span>Viber</span></a>}{contacts.email&&<a href={`mailto:${contacts.email}`} aria-label="Написати на електронну пошту"><Mail size={18}/><span>Пошта</span></a>}</nav><dialog ref={ref} className="mobile-menu" onCancel={()=>setOpen(false)}><div className="menu-top"><Logo/><button onClick={()=>setOpen(false)} aria-label="Закрити меню"><X/></button></div><nav>{[['Головна','/'],...navigation,['Калькулятор','/calculator']].map(([n,h])=><Link key={h} href={h} onClick={()=>setOpen(false)}>{n}<ArrowUpRight size={22}/></Link>)}</nav>{phoneHref?<a className="mobile-menu-phone" href={phoneHref}><Phone size={16}/>{phoneLabel}</a>:<p className="mobile-menu-phone"><Phone size={16}/>{phoneLabel}</p>}<p>Вінницька область</p></dialog></>;
}
