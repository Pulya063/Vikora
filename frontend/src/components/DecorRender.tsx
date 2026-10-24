import type {CSSProperties} from 'react';

/**
 * Colour-accurate 3D render of a window sill or an outside ebb.
 * Used whenever there is no real photo for the selected decor, so the
 * preview always shows exactly the colour the visitor picked.
 */
export default function DecorRender({kind,swatch,gloss=false,label,compact=false}:{kind:'sill'|'ebb';swatch:string;gloss?:boolean;label:string;compact?:boolean}){
  return <div className={`decor-render decor-render--${kind}${gloss?' is-gloss':''}${compact?' is-compact':''}`} style={{'--decor':swatch} as CSSProperties} role="img" aria-label={label}>
    <div className="decor-render__piece">
      {kind==='ebb'&&<span className="decor-render__back"/>}
      <span className="decor-render__top"/>
      <span className="decor-render__front"/>
    </div>
    <span className="decor-render__shadow" aria-hidden="true"/>
  </div>;
}
