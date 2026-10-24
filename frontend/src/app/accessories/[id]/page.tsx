import MeshConfigurator from '@/components/MeshConfigurator';
import HandleOptions from '@/components/HandleOptions';
import SillConfigurator from '@/components/SillConfigurator';
import EbbConfigurator from '@/components/EbbConfigurator';
import CatalogGuide from '@/components/CatalogGuide';
import {accessoryGuides} from '@/lib/catalogGuides';
import {accessoryVisuals} from '@/lib/accessoryVisuals';
import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft, ArrowUpRight} from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import {accessoryDetails} from '@/lib/accessoryDetails';

export function generateStaticParams(){return Object.keys(accessoryDetails).map(id=>({id}));}
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const {id}=await params;const item=accessoryDetails[id];
  return item?{title:`${item.name} — комплектуючі`,description:item.lead}:{title:'Комплектуючі'};
}
export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const item=accessoryDetails[id];if(!item)notFound();
  const visual=accessoryVisuals[id];const guide=accessoryGuides[id];
  const cta=<Link prefetch={false} className="button" href={`/contacts?interest=${encodeURIComponent(item.name)}#quote`}>{guide.cta} <ArrowUpRight size={17}/></Link>;
  const credit=visual&&<p className="source-note">{visual.credit==='VIKORA'?'Предметна візуалізація VIKORA; точний склад підбираємо під профіль і ваші потреби.':visual.credit?<>Фото: <a href={visual.source || item.source} target="_blank" rel="noreferrer">{visual.credit} ↗</a>. Вигляд конкретної комплектації може відрізнятися.</>:'Вигляд конкретної комплектації може відрізнятися.'}</p>;
  return <main id="main"><PageIntro label="Комплектуючі" title={item.name} description={item.lead} breadcrumbs={[{label:'Головна',href:'/'},{label:'Комплектуючі',href:'/accessories'},{label:item.name}]}
    media={visual?{src:visual.image,alt:visual.caption,fit:'contain'}:undefined} actions={cta} note={credit}/>
    <section className="section accessory-detail"><div className="container">


      {id==='handles'&&<HandleOptions/>}
      {id!=='handles'&&item.variants&&<div className={`accessory-variant-grid${item.variants.length===2?' accessory-variant-grid--two':''}`}>{item.variants.map((variant,i)=><article key={variant.name}>
        <span className="eyebrow">{String(i+1).padStart(2,'0')} / ВАРІАНТИ</span>
        {variant.image&&<img className="catalog-variant-photo" src={variant.image} alt={variant.name} width={500} height={350} loading="lazy"/>}
        <h3>{variant.name}</h3><p>{variant.description}</p><ul>{variant.specifications.map(spec=><li key={spec}>{spec}</li>)}</ul>
        {variant.colors&&<><p className="caption">Доступні декори · точний відтінок обираємо за зразком</p><div className="catalog-colors" role="list" aria-label={`Декори ${variant.name}`}>{variant.colors.map(c=><span className="catalog-colour-chip" role="listitem" key={c.name}><i style={{background:c.swatch}}/><span>{c.name}</span></span>)}</div></>}
        {'calculatorOption' in variant?<Link prefetch={false} className="text-link" href={`/calculator?profile=grand-pro&extra=${variant.calculatorOption}`}>Додати до комплектації <ArrowUpRight size={16}/></Link>:<Link prefetch={false} className="text-link" href={`/contacts?interest=${encodeURIComponent(item.name+' — '+variant.name)}#quote`}>Підібрати цей варіант <ArrowUpRight size={16}/></Link>}
        <p className="source-note"><a href={variant.source} target="_blank" rel="noreferrer">Джерело характеристик ↗</a></p>
      </article>)}</div>}
      {id==='window-sills'&&<SillConfigurator/>}
      {id==='ebbs'&&<EbbConfigurator/>}
      <div className="accessory-detail-points">{item.points.map(point=><p key={point}>{point}</p>)}</div>
      <div className="accessory-detail-footer"><Link prefetch={false} className="text-link" href="/accessories"><ArrowLeft size={16}/> Усі комплектуючі</Link><a className="text-link" href={item.source} target="_blank" rel="noreferrer">Каталог LUVIN <ArrowUpRight size={16}/></a></div>
    </div></section>
    {id==='mosquito-nets'&&<MeshConfigurator/>}
    <CatalogGuide guide={guide} interest={item.name}/>
  </main>;
}
