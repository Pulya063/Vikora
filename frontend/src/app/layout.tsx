import type {Metadata} from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SmoothScroll from '@/components/SmoothScroll';
import './globals.css';
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000'),title:{default:'VIKORA — вікна та вхідні двері у Вінниці',template:'%s | VIKORA'},description:'Металопластикові вікна, вхідні двері та комплектуючі у Вінниці й області. Підбір продукції LUVIN, замір, доставка та монтаж.',openGraph:{title:'VIKORA — більше можливостей для вашого дому',locale:'uk_UA',type:'website',images:[{url:'/images/hero-home-premium.webp',width:1672,height:941}]},robots:{index:process.env.ALLOW_INDEXING==='true',follow:process.env.ALLOW_INDEXING==='true'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="uk" data-scroll-behavior="smooth"><body><SmoothScroll/><Header/>{children}<Footer/></body></html>}
