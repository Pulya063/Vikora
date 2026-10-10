import {accessoryDetails} from '@/lib/accessoryDetails';
import {doorProducts} from '@/lib/doorProducts';
import type {MetadataRoute} from 'next';
import {products} from '@/lib/data';
export default function sitemap():MetadataRoute.Sitemap{return ['', '/assortment','/accessories','/about','/contacts','/calculator','/social','/technologies',...[...products,...doorProducts].map(p=>'/assortment/'+p.id),...Object.keys(accessoryDetails).map(id=>'/accessories/'+id)].map(p=>({url:(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000')+p}))}
