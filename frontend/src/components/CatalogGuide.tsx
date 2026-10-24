import Link from 'next/link';
import {ArrowUpRight, Plus} from 'lucide-react';
import type {CatalogGuide as Guide} from '@/lib/catalogGuides';

export default function CatalogGuide({guide, interest}: {guide: Guide; interest: string}) {
  return <>
    <section className="section catalog-guide"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">ВАШ ПРОСТІР · ВАШІ ПОТРЕБИ</span><h2>{guide.title}</h2><p>{guide.text}</p></div></div>
      <div className="catalog-use-grid">{guide.uses.map((use, i) => <article key={use.title}><span className="eyebrow">0{i + 1} / ЗАСТОСУВАННЯ</span><h3>{use.title}</h3><p>{use.text}</p></article>)}</div>
    </div></section>
    <section className="section catalog-selection"><div className="container split">
      <div><span className="eyebrow">ПІДГОТУЙМО РІШЕННЯ РАЗОМ</span><h2>Що допоможе<br/>з точним підбором</h2><ul className="catalog-checklist">{guide.checklist.map(item => <li key={item}>{item}</li>)}</ul><p className="caption">Не знаєте всіх параметрів? Почнемо з фото та короткої розмови.</p></div>
      <div className="faq-list">{guide.faq.map(item => <details key={item.question}><summary>{item.question}<Plus size={18}/></summary><p>{item.answer}</p></details>)}</div>
    </div></section>
    <section className="section catalog-cta"><div className="container split">
      <div><span className="eyebrow">НАСТУПНИЙ КРОК</span><h2>{guide.cta}</h2><p>Розкажіть про свій простір. Уточнимо сумісність, запропонуємо комплектацію та погодимо розрахунок.</p></div>
      <div><Link prefetch={false} className="button" href={`/contacts?interest=${encodeURIComponent(interest)}#quote`}>Отримати консультацію <ArrowUpRight size={18}/></Link><p className="caption">Вінницька область. Доставка й монтаж — за погодженням.</p><Link prefetch={false} className="text-link" href="/accessories">Доповнити комплектуючими <ArrowUpRight size={16}/></Link></div>
    </div></section>
  </>;
}
