import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowDownRight,ArrowUpRight,Blocks,DoorOpen,PanelsTopLeft} from 'lucide-react';
import PageIntro from '@/components/PageIntro';
import {Products,Doors,Accessories} from '@/components/Sections';
import styles from './category-tabs.module.css';
export const metadata:Metadata={title:'Асортимент — вікна, двері та комплектуючі'};
export default function Page(){return <main id="main"><PageIntro label="Асортимент" title="Рішення для вашого дому." description="Вікна, які зберігають затишок. Двері, що зустрічають удома. Деталі, які роблять життя зручнішим."/><nav className={`container ${styles.categoryTabs}`} aria-label="Категорії">
  <a className={styles.categoryTab} href="#windows"><span className={styles.categoryIcon} aria-hidden="true"><PanelsTopLeft size={18} strokeWidth={1.7}/></span><span className={styles.categoryLabel}>Вікна</span><ArrowDownRight className={styles.direction} size={15} aria-hidden="true"/></a>
  <a className={styles.categoryTab} href="#doors"><span className={styles.categoryIcon} aria-hidden="true"><DoorOpen size={18} strokeWidth={1.7}/></span><span className={styles.categoryLabel}>Вхідні двері</span><ArrowDownRight className={styles.direction} size={15} aria-hidden="true"/></a>
  <Link prefetch={false} className={styles.categoryTab} href="/accessories"><span className={styles.categoryIcon} aria-hidden="true"><Blocks size={18} strokeWidth={1.7}/></span><span className={styles.categoryLabel}>Комплектуючі</span><ArrowUpRight className={styles.direction} size={15} aria-hidden="true"/></Link>
 </nav><Products/><Doors/><Accessories/></main>}
