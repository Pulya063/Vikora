import Link from 'next/link';
import {Mail, MessageCircle, Phone, Send} from 'lucide-react';
import {Logo} from './Header';
import {navigation, business} from '@/lib/data';

export default function Footer() {
  const phone = business.contacts.phone as string | null;
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
        <a href="tg://resolve?phone=%2B380674243325"><Send size={15}/><span>Telegram</span></a>
        <a href="viber://chat?number=%2B380674243325"><MessageCircle size={15}/><span>Viber</span></a>
        <a href="mailto:vikora.info@gmail.com"><Mail size={15}/><span>vikora.info@gmail.com</span></a>
      </address>
    </div>
    <div className="container footer-bottom">
      <span>© {new Date().getFullYear()} VIKORA</span>
      <span>Попередній розрахунок уточнює менеджер</span>
      <Link href="/privacy">Конфіденційність</Link>
    </div>
  </footer>;
}
