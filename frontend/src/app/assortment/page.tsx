import type {Metadata} from 'next';
import Link from 'next/link';
import PageIntro from '@/components/PageIntro';
import {Products,Doors,Accessories} from '@/components/Sections';
export const metadata:Metadata={title:'Асортимент — вікна, двері та комплектуючі'};
export default function Page(){return <main id="main"><PageIntro label="Асортимент" title="Рішення для вашого дому." description="Вікна, які зберігають затишок. Двері, що зустрічають удома. Деталі, які роблять життя зручнішим."/><nav className="container category-tabs" aria-label="Категорії"><Link href="#windows">Вікна</Link><Link href="#doors">Вхідні двері</Link><Link href="/accessories">Комплектуючі</Link></nav><Products/><Doors/><Accessories/></main>}
