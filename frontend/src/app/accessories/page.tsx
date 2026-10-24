import MeshConfigurator from '@/components/MeshConfigurator';
import AccessoryShowcase from '@/components/AccessoryShowcase';
import {accessoryVisuals} from '@/lib/accessoryVisuals';
import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import {accessoryCatalog} from '@/lib/data';
import {accessoryDetails} from '@/lib/accessoryDetails';

export const metadata:Metadata={
 title:'Комплектуючі для вікон',
 description:'Москітні сітки, підвіконня, відливи, ручки, дитячі замки, фурнітура та склопакети у Вінниці й області.'
};

export default function Page(){return <main id="main">
 <PageIntro label="Комплектуючі" title="Комфорт складається з деталей." description="Підберемо доповнення до нового або встановленого вікна. Перед замовленням перевіряємо розміри, тип конструкції та сумісність."
  media={{src:'/images/accessories/handle.webp',alt:'Ручка та профіль металопластикового вікна',fit:'contain'}}
  actions={<Link prefetch={false} className="button" href="/contacts?interest=Комплектуючі#quote">Отримати консультацію <ArrowUpRight size={18}/></Link>}
  note={<p className="caption">Можна замовити окремо одну деталь або повну комплектацію.</p>}/>
 <AccessoryShowcase/><MeshConfigurator/><section className="section accessories-catalog"><div className="container"><div className="section-heading"><div><span className="eyebrow">ДОДАТКОВІ РІШЕННЯ</span><h2>Комплектуючі для вікон</h2><p>Наявність, колір і сумісність конкретної деталі підтверджуємо перед замовленням.</p></div></div><div className="accessory-grid">{accessoryCatalog.map((item,i)=><article id={item.id} key={item.id}>{accessoryVisuals[item.id]&&<img className="accessory-catalog-photo" src={accessoryVisuals[item.id].image} alt={accessoryVisuals[item.id].caption} width={500} height={400} loading="lazy"/>}<span>{String(i+1).padStart(2,'0')}</span><h3>{item.name}</h3><p>{item.description}</p>{accessoryDetails[item.id]?<Link prefetch={false} className="text-link" href={`/accessories/${item.id}`}>Переглянути варіанти <ArrowUpRight size={17}/></Link>:<Link prefetch={false} className="text-link" href={`/contacts?interest=${encodeURIComponent(item.name)}#quote`}>Уточнити наявність <ArrowUpRight size={17}/></Link>}</article>)}</div></div></section>
 </main>}
