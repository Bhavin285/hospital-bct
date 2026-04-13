import { useState, useEffect } from 'react';
import { useLang, t } from '../context/LanguageContext';

export default function Navbar() {
  const { lang, setLang } = useLang();
  const [mobOpen, setMobOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const secs = document.querySelectorAll('section[id]');
    const handler = () => {
      let cur = 'hero';
      secs.forEach(s => { if (window.scrollY >= s.offsetTop - 100) cur = s.id; });
      setActiveSection(cur);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = [
    { href: '#hero', en: 'Home', gu: 'હોમ' },
    { href: '#about', en: 'About', gu: 'અમારા વિશે' },
    { href: '#activities', en: 'Activities', gu: 'પ્રવૃત્તિઓ' },
    { href: '#donate', en: 'Donate', gu: 'દાન' },
    { href: '#contact', en: 'Contact', gu: 'સંપર્ક' },
  ];

  return (
    <>
      <div className="lang-bar">
        <div className="lang-toggle">
          <button className={`lang-btn${lang === 'en' ? ' active' : ''}`} onClick={() => setLang('en')}>English</button>
          <button className={`lang-btn${lang === 'gu' ? ' active' : ''}`} onClick={() => setLang('gu')}>ગુજરાતી</button>
        </div>
      </div>
      <nav>
        <a className="nav-brand" href="#hero">
          <div className="nav-ring">
            <img src="/logo.png" alt="Bezuban Logo" />
          </div>
          <div>
            <span className="nb-t1">Bezuban Charitable Trust</span>
            <span className="nb-t2">બેઝુબાન ચેરીટેબલ ટ્રસ્ટ</span>
          </div>
        </a>
        <ul className="nav-links">
          {links.map(l => (
            <li key={l.href}>
              <a href={l.href} className={activeSection === l.href.slice(1) ? 'active' : ''}>
                {t(lang, l.en, l.gu)}
              </a>
            </li>
          ))}
        </ul>
        <a className="nav-cta" href="#donate">{t(lang, 'Donate Now', 'દાન કરો')}</a>
        <button className="hamburger" onClick={() => setMobOpen(o => !o)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </nav>
      <div className={`mob-menu${mobOpen ? ' open' : ''}`}>
        {links.map(l => (
          <a key={l.href} href={l.href} onClick={() => setMobOpen(false)}>{t(lang, l.en, l.gu)}</a>
        ))}
        <a href="#donate" onClick={() => setMobOpen(false)}>{t(lang, 'Contact & Donate →', 'સંmparkr & Dan →')}</a>
      </div>
    </>
  );
}
