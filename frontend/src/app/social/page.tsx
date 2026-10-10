import PageIntro from '@/components/PageIntro';
import Link from 'next/link';
import {ArrowUpRight,Instagram,Facebook,Send} from 'lucide-react';
import {business} from '@/lib/data';
export const metadata={title:'VIKORA у соцмережах'};
export default function Page(){return <main id="main"><PageIntro label="Соцмережі" title="Залишаймося на зв’язку." description="Тут з’являться наші сторінки: ідеї для дому, пояснення технологій і відповіді на ваші запитання."/><section className="container social-list">{[[Instagram,'Instagram','instagram'],[Facebook,'Facebook','facebook'],[Send,'Telegram','telegram']].map(([Icon,name,key])=>{const I=Icon as typeof Instagram;const url=business.socials[key as keyof typeof business.socials];return <div key={String(name)}><I size={30} strokeWidth={1.3}/><h2>{String(name)}</h2>{url?<a href={url} rel="noreferrer" target="_blank">Перейти<ArrowUpRight/></a>:<span>Сторінку ще не підключено</span>}</div>})}</section><div className="container section"><p>Поки що можна залишити запит через форму на сайті.</p><Link className="button" href="/contacts#quote">Залишити заявку <ArrowUpRight size={18}/></Link></div></main>}
