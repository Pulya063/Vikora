import PageIntro from '@/components/PageIntro';
import {Technologies} from '@/components/Sections';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Технології та можливості сучасних вікон',
  description: 'Дізнайтеся про енергоефективні склопакети, сонцезахист, теплу дистанційну рамку та сучасну фурнітуру для вікон у Вінниці.'
};

export default function Page() {
  return (
    <main id="main">
      <PageIntro
        label="Технології"
        title="Більше комфорту, ніж здається."
        description="Розбираємося, що насправді дають сучасні склопакети, фурнітура та маленькі корисні деталі."
        media={{
          src: '/images/technologies-hero.webp',
          alt: 'Сучасні енергоефективні вікна з панорамним склінням у затишному інтер’єрі'
        }}
        actions={
          <Link prefetch={false} className="button" href="/calculator">
            Розрахувати вікно <ArrowUpRight size={18} />
          </Link>
        }
        note={
          <p className="caption">Підберемо оптимальну комплектацію склопакета й фурнітури під ваші потреби.</p>
        }
      />
      <Technologies full />
    </main>
  );
}
