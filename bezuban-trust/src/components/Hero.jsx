import { useEffect, useRef } from 'react';
import { useLang, t } from '../context/LanguageContext';

export default function Hero({ stats }) {
  const { lang } = useLang();
  const parallaxRef = useRef(null);

  useEffect(() => {
    const handler = () => {
      if (parallaxRef.current) {
        parallaxRef.current.style.transform = `translateY(${window.scrollY * 0.12}px)`;
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <section id="hero">
      <div className="h-gbg" />
      <div className="h-g1" />
      <div className="h-g2" />
      <div className="parallax" ref={parallaxRef} />
      <div className="h-inner">
        <div>
          <div className="h-pill">
            🐾 {t(lang, 'Animals & Bird Helpline · Ahmedabad', 'પ્રાણીઓ અને પક્ષીઓ હેલ્પલાઇન · અમદાવાદ')}
          </div>
          <h1 className="h-title">
            {lang === 'en'
              ? <>Voicing the<br /><span className="acc">Voiceless</span></>
              : <>જેઓનો અવાજ નથી<br /><span className="acc">તેમને અવાજ આપવો</span></>
            }
          </h1>
          <p className="h-sub">{t(lang, '|| Sarve Santu Niramaya || — Since 2021', '|| સર્વે સંતુ નિરામયા || — ૨૦૨૧ થી')}</p>
          <p className="h-desc">
            {t(lang,
              'Bezuban Charitable Trust provides completely free rescue, treatment and hospital care for sick, injured and helpless animals and birds across Ahmedabad — because they cannot speak for themselves.',
              'બેઝુબાન ચેરિટેબલ ટ્રસ્ટ અમદાવાદમાં બીમાર, ઇજાગ્રસ્ત અને લાચાર પશુઓ તથા પક્ષીઓ માટે સંપૂર્ણપણે મફત રેસ્ક્યૂ, સારવાર અને હોસ્પિટલ સેવા પૂરી પાડે છે — કારણ કે તેઓ પોતે બોલી શકતા નથી.'
            )}
          </p>
          <div className="h-btns">
            <a className="btn-s" href="#donate">💛 {t(lang, 'Donate Now', 'હમણાં જ દાન કરો')}</a>
            <a className="btn-g" href="#activities">{t(lang, 'Our Work →', 'અમારું કાર્ય →')}</a>
          </div>
          <div className="h-stats">
            {stats.map((s, i) => (
              <div key={i}>
                <div className="hs-n">{s.value}</div>
                <div className="hs-l">{t(lang, s.label.en, s.label.gt)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-logo-wrap">
          <img src="/logo.png" alt="Bezuban Charitable Trust" />
        </div>
      </div>
    </section>
  );
}
