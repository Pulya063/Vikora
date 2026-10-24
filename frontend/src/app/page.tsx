import MeshConfigurator from '@/components/MeshConfigurator';
import Hero from '@/components/Hero';
import {Categories,Products,CalculatorTeaser,Technologies,Doors,Accessories,Process,FAQ,TrustStats} from '@/components/Sections';
import QuoteForm from '@/components/QuoteForm';
import JsonLd from '@/components/JsonLd';
export default function Home(){return <main id="main"><JsonLd data={{'@context':'https://schema.org','@type':'HomeAndConstructionBusiness',name:'VIKORA',url:process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000',areaServed:['Вінниця','Вінницька область'],description:'Металопластикові вікна та зовнішні двері. Підбір, замір, доставка та монтаж.'}}/><Hero/><div className="page-content"><TrustStats/><Categories/><Products/><CalculatorTeaser/><Technologies/><Doors/><Accessories/><MeshConfigurator/><Process/><FAQ/><QuoteForm/></div></main>}
