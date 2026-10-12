'use client';
import Link from 'next/link';
import {Mail, MessageCircle, Phone, Send} from 'lucide-react';
import {Logo} from './Header';
import {navigation, business} from '@/lib/data';
import {usePublicContacts} from './ContactsProvider';

export default function Footer() {
  const {contacts}=usePublicContacts();
  const phone = contacts.phone;
  const phoneHref = phone ? `tel:${phone.replace(/[^+\d]/g, '')}` : undefined;

  return <footer>
    <div className="container footer-top">
      <div className="footer-brand">
        <Logo/>
        <p>Більше тепла.<br/>Більше можливостей.</p>
      </div>
      <nav aria-label="Навігація внизу">
        {navigation.map(([name, href]) => <Link key={href} href={href}>{name}</Link>)}
        <Link href="/calculator">Калькулятор</Link>
      </nav>
      <div className="footer-service">
        <p>Вінницька область</p>
        <p>{business.supplier.wording}</p>
        <Link href="/contacts#quote">Залишити заявку ↗</Link>
      </div>
      <address className="footer-contacts">
        <span className="footer-contact-title">ЗВ’ЯЗАТИСЯ</span>
        {phoneHref && <a href={phoneHref}><Phone size={15}/><span>{phone}</span></a>}
        {contacts.telegram&&<a href={contacts.telegram}><Send size={15}/><span>Telegram</span></a>}
        {contacts.viber&&<a href={contacts.viber}><MessageCircle size={15}/><span>Viber</span></a>}
        {contacts.email&&<a href={`mailto:${contacts.email}`}><Mail size={15}/><span>{contacts.email}</span></a>}
      </address>
    </div>
    <div className="container footer-bottom">
      <span>© {new Date().getFullYear()} VIKORA</span>
      <span>Попередній розрахунок уточнює менеджер</span>
      <Link href="/privacy">Конфіденційність</Link>
    </div>
  </footer>;
}
