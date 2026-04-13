import { useLang, t } from '../context/LanguageContext';
import { useReveal } from '../hooks/useReveal';

export default function Statistics({ stats }) {
  const { lang } = useLang();
  const hdr = useReveal();
  const cards = useReveal();

  return (
    <div className="stat-strip">
      <div className="stat-strip-in">
        <div ref={hdr.ref} className={`stat-hdr rv${hdr.visible ? ' in' : ''}`}>
          <h2>{t(lang,
            'Healthcare Delivered — Statistics (as of 31 May 2025)',
            'પ્રદત્ત આરોગ્ય સેવા — આંકડા (૩૧ મે ૨૦૨૫ સુધી)'
          )}</h2>
          <p>{t(lang,
            'All treatments provided completely free of cost · Funded by generous donors',
            'બધી સારવાર સંપૂર્ણપણે મફતમાં પૂરી પાડવામાં આવી છે · ઉદાર દાતાઓ દ્વારા સહાયિત'
          )}</p>
        </div>
        <div ref={cards.ref} className={`stat-cards rv${cards.visible ? ' in' : ''}`}>
          {stats.map((s, i) => (
            <div key={i} className="sc">
              <div className="sc-n">{s.value}</div>
              <div className="sc-c">{t(lang, s.category.en, s.category.gt)}</div>
              <div className="sc-l">{t(lang, s.subCategory.en, s.subCategory.gt)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
