import Link from 'next/link';
import type {ReactNode} from 'react';

type Crumb={label:string;href?:string};
type Media={src:string;alt:string;fit?:'cover'|'contain'};

export function Breadcrumbs({items}:{items:Crumb[]}){return <nav className="breadcrumbs" aria-label="Хлібні крихти">{items.map((item,index)=><span className="breadcrumb-item" key={`${item.label}-${index}`}>{index>0&&<i aria-hidden="true">/</i>}{item.href?<Link prefetch={false} href={item.href}>{item.label}</Link>:<span aria-current="page">{item.label}</span>}</span>)}</nav>}

/**
 * Page header. Without `media` — text-only intro.
 * With `media` — split hero: photo left, intro text + actions right.
 */
export default function PageIntro({label,title,description,breadcrumbs,media,actions,note}:{
  label:string;title:string;description:string;breadcrumbs?:Crumb[];
  media?:Media;actions?:ReactNode;note?:ReactNode;
}){
  const items=breadcrumbs||[{label:'Головна',href:'/'},{label}];
  const copy=<>
    <Breadcrumbs items={items}/>
    <span className="eyebrow">VIKORA · {label.toUpperCase()}</span>
    <h1>{title}</h1>
    <p>{description}</p>
    {actions&&<div className="page-hero__actions">{actions}</div>}
    {note&&<div className="page-hero__note">{note}</div>}
  </>;
  if(!media)return <div className="container page-intro">{copy}</div>;
  return <section className="page-hero"><div className="container page-hero__grid">
    <div className={`page-hero__media${media.fit==='contain'?' page-hero__media--contain':''}`}>
      <img src={media.src} alt={media.alt} fetchPriority="high"/>
    </div>
    <div className="page-hero__copy">{copy}</div>
  </div></section>;
}
