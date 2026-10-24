import Link from 'next/link';
export default function NotFound(){return <main id="main" className="container page-intro"><span className="eyebrow">404</span><h1>Цієї сторінки немає.</h1><p>Повернімося до вибору вікон для вашого дому.</p><Link prefetch={false} className="button" href="/assortment">Перейти до асортименту</Link></main>}
