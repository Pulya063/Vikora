export type Configuration = {
 product_type:'window'; profile:string; dimensions:{width_mm:number;height_mm:number}; construction:'fixed'|'single'|'double'|'triple'; sections:number; opening:('fixed'|'turn'|'tilt_turn')[]; glass_unit:string; color:'white'; extras:string[]; services_requested:{delivery:boolean;installation:boolean};
};
export type Estimate = {estimated_product_price_uah:number;currency:'UAH';is_mock:boolean;pricing_version:string;configuration:Configuration};
