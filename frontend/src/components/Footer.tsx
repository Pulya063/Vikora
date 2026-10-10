import Link from 'next/link';
import {Logo} from './Header';
import {navigation,business} from '@/lib/data';
export default function Footer(){return <footer><div className="container footer-top"><div><Logo/><p>Більше тепла.<br/>Більше можливостей.</p></div><nav aria-label="Навігація внизу">{navigation.map(([n,h])=><Link key={h} href={h}>{n}</Link>)}<Link href="/calculator">Калькулятор</Link></nav><div><p>Вінницька область</p><p>{business.supplier.wording}</p><Link href="/contacts#quote">Залишити заявку ↗</Link></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} VIKORA</span><span>Попередній розрахунок уточнює менеджер</span><Link href="/privacy">Конфіденційність</Link></div></footer>}
