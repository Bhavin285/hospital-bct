import { useLang, t } from '../context/LanguageContext';
import { useReveal } from '../hooks/useReveal';

export default function Contact() {
  const { lang } = useLang();
  const hdr = useReveal();
  const left = useReveal();
  const right = useReveal();

  return (
    <section id="contact" className="sec sec-white">
      <div className="container">
        <div ref={hdr.ref} className={`rv${hdr.visible ? ' in' : ''}`}>
          <div className="chip n">{t(lang, 'Get in Touch', 'સંપર્કમાં રહો')}</div>
          <h2 className="s-head">{t(lang, 'Reach Out to Us', 'અમારો સંપર્ક કરો')}</h2>
          <p className="s-desc">
            {t(lang,
              'Found an injured animal? Want to donate or volunteer? We are here 24/7 for every voiceless creature.',
              'ઇજાગ્રસ્ત પ્રાણી મળ્યો? દાન કરવું છે કે સ્વયંસેવક બનવું છે? અમે દરેક બેઝુબાન જીવ માટે ૨૪/૭ ઉપલબ્ધ છીએ.'
            )}
          </p>
        </div>
        <div className="con-grid">
          <div ref={left.ref} className={`rvl${left.visible ? ' in' : ''}`}>
            <div className="ci">
              <div className="ci-ico">📍</div>
              <div className="ci-t">
                <strong>{t(lang, 'Hospital Address', 'હોસ્પિટલ સરનામુ')}</strong>
                <span>{t(lang,
                  'Plot No. 468, Fulpura Gam Road, Valad, Nana Chiloda, Ta.Ji. Gandhinagar – 382355',
                  'પ્લોટ નં. ૪૬૮, ફુલપુરા ગામ રોડ, વાલાડ, નાના ચિલોડા, તા. જી. ગાંધીનગર – ૩૮૨૩૫૫'
                )}</span>
              </div>
            </div>
            <div className="ci">
              <div className="ci-ico">📧</div>
              <div className="ci-t">
                <strong>Email</strong>
                <a href="mailto:bezubancharitabletrust@gmail.com">bezubancharitabletrust@gmail.com</a>
              </div>
            </div>
            <div className="ci">
              <div className="ci-ico">🧑‍💼</div>
              <div className="ci-t">
                <strong>{t(lang, 'Donation — Jigneshbhai Panchal', 'દાન — જિગ્નેશભાઈ પંચાલ')}</strong>
                <a href="tel:9714135771">+91 97141 35771</a>
                <span className="note">{t(lang,
                  'C-183, Vibhag-7, Parshwanath Township, Nava Naroda, Ahmedabad – 382 345',
                  ''
                )}</span>
              </div>
            </div>
            <div className="ci">
              <div className="ci-ico">🧑‍💼</div>
              <div className="ci-t">
                <strong>{t(lang, 'Donation — Jayeshbhai Bhimani', 'દાન — જયેશભાઈ ભિમાની')}</strong>
                <a href="tel:9879161454">+91 98791 61454</a>
                <span className="note">{t(lang,
                  'J.J. Organisation, Gandhi Road, Ahmedabad – 380 001',
                  ''
                )}</span>
              </div>
            </div>
            <div className="soc-row">
              <a className="soc" href="#" title="Instagram">📸</a>
              <a className="soc" href="#" title="Facebook">👤</a>
              <a className="soc" href="#" title="YouTube">▶️</a>
              <a className="soc" href="https://wa.me/918866421316" title="WhatsApp">💬</a>
            </div>
          </div>
          <div ref={right.ref} className={`rvr${right.visible ? ' in' : ''}`}>
            <div className="hl-card">
              <div className="hl-tag">🐾 {t(lang, 'Animal Emergency Helpline', 'પ્રાણી ઇમરજન્સી હેલ્પલાઇન')}</div>
              <div className="hl-num"><a href="tel:8866421316">88664 21316</a></div>
              <div className="hl-sub">{t(lang, 'WhatsApp / Call · Available 24 / 7', 'વોટ્સએપ / કોલ · ૨૪/૭ ઉપલબ્ધ')}</div>
            </div>
            <div className="hl-card2">
              <div className="hl-tag">{t(lang, 'Special Information Line', 'વિશેષ માહિતી લાઇન')}</div>
              <div className="hl-num"><a href="tel:9714135771">97141 35771</a></div>
              <div className="hl-sub">{t(lang, 'Donations & General Enquiries', 'દાન અને સામાન્ય પૂછપરછ')}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
