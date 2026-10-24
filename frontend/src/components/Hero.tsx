'use client';
import Link from 'next/link';
import {ArrowRight,MapPin,Ruler,Truck,ShieldCheck} from 'lucide-react';
import {business} from '@/lib/data';

export function Benefits() {
  return (
    <div className="benefits">
      {[
        [MapPin, 'Вінницька область'],
        [Ruler, 'Професійний замір'],
        [Truck, 'Доставка та монтаж'],
        [ShieldCheck, 'Якісні матеріали']
      ].map(([Icon, label]) => {
        const I = Icon as typeof MapPin;
        return (
          <span key={String(label)}>
            <I size={22} strokeWidth={1.4} />
            <span>{String(label)}</span>
          </span>
        );
      })}
    </div>
  );
}

export default function Hero() {
  return (
    <section className="hero static-hero">
      <div className="hero-stage">
        <picture>
          <img 
            className="hero-image" 
            src="/images/hero-home-premium.webp" 
            alt="Світлий інтер’єр із панорамними ПВХ-вікнами та краєвидом на річку" 
            fetchPriority="high"
          />
        </picture>
        
        <div className="hero-copy">
          <h1>Вікна, які<br/>відкривають<br/>більше можливостей</h1>
          <p className="hero-description">
            Металопластикові вікна та зовнішні двері.<br/>
            Допоможемо підібрати комплектацію, розрахуємо вартість та виконаємо професійний монтаж у Вінниці та області.
          </p>
          <p className="service-note">{business.serviceNotice}</p>
          
          <div className="actions">
            <Link prefetch={false} className="button" href="/calculator">
              Розрахувати вартість <ArrowRight size={17} />
            </Link>
            <Link prefetch={false} className="button secondary" href="/assortment">
              Переглянути вікна
            </Link>
          </div>
          
          <Benefits />
        </div>
      </div>
    </section>
  );
}


