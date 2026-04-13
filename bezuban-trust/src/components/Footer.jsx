import { useLang, t } from '../context/LanguageContext';

export default function Footer() {
  const { lang } = useLang();

  return (
    <footer>
      <div className="ft-in">
        <div className="ft-name">Bezuban Charitable Trust</div>
        <div className="ft-guj">Bezuban Charitable Trust — Abol Jivoni Bolti Duvao nu Prasthishthan</div>
        <nav className="ft-nav">
          <a href="#hero">{t(lang, 'Home', 'હોમ')}</a>
          <a href="#about">{t(lang, 'About', 'અમારા વિશે')}</a>
          <a href="#activities">{t(lang, 'Activities', 'પ્રવૃત્તિઓ')}</a>
          <a href="#donate">{t(lang, 'Donate', 'દાન')}</a>
          <a href="#contact">{t(lang, 'Contact', 'સંmparkr')}</a>
        </nav>
        <div className="ft-meta">
          <strong>Reg. No.: E/22904/AHMEDABAD</strong> &nbsp;|&nbsp; <strong>PAN: AAETB1212F</strong><br />
          80-G (5) &amp; CSR Certified · {t(lang, 'Donations are tax-exempt', 'Dan kar-mukt che')}
        </div>
        <div className="ft-quote">"Sarve Santu Niramaya" — || Sarve Santu Niramaya: ||</div>
        <div style={{ fontSize: '.75rem' }}>© 2025 Bezuban Charitable Trust. All rights reserved.</div>
      </div>
    </footer>
  );
}
