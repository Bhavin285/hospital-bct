import { useEffect, useRef } from 'react';
import { useLang, t } from '../context/LanguageContext';
import { useReveal } from '../hooks/useReveal';

export default function About() {
  const { lang } = useLang();
  const rv = useReveal();
  const rvl = useReveal();
  const rvr = useReveal();

  return (
    <section id="about" className="sec sec-mist">
      <div className="container">
        <div ref={rv.ref} className={`rv${rv.visible ? ' in' : ''}`}>
          <div className="chip">{t(lang, 'About Us', 'અમારા વિશે')}</div>
          <h2 className="s-head">
            {t(lang,
              <>A Hospital for Those Who<br />Cannot Ask for Help</>,
              'જે મદદ માંગી શકતા નથી તેમના માટેનું હોસ્પિટલ'
            )}
          </h2>
          <p className="s-italic">
            {t(lang,
              '|| Sarve Santu Niramaya || — May all beings be free from suffering',
              '|| સર્વે સંતુ નિરામયા || — બધા જીવ દુઃખથી મુક્ત રહે'
            )}
          </p>
          <p className="s-desc">
            {t(lang,
              'For over 7 years, Bezuban Charitable Trust has been rescuing, treating and caring for sick, accident-prone and helpless animals and birds across Ahmedabad — completely free of charge.',
              'છેલ્લા ૭ વર્ષથી વધુ સમયથી, બેઝુબાન ચેરિટેબલ ટ્રસ્ટ અમદાવાદભરમાં બીમાર, અકસ્માતગ્રસ્ત અને લાચાર પશુઓ તથા પક્ષીઓનું રેસ્ક્યૂ, સારવાર અને સંભાળ રાખી રહ્યું છે — સંપૂર્ણપણે મફતમાં.'
            )}
          </p>
        </div>
        <div className="about-grid">
          <div ref={rvl.ref} className={`a-blocks rvl${rvl.visible ? ' in' : ''}`}>
            <div className="abl">
              <h3>🏥 {t(lang, 'Animal Hospital', 'પ્રાણી હોસ્પિટલ')}</h3>
              <p>{t(lang,
                'Fully equipped veterinary hospital at Valad, Nana Chiloda, Gandhinagar with modern OT, hydraulic table and physiotherapy — all completely free.',
                'વાલાડ, નાના ચિલોડા, ગાંધીનગર ખાતે આધુનિક ઓટી, હાઇડ્રોલિક ટેબલ અને ફિઝિયોથેરાપી સાથે સંપૂર્ણ સુસજ્જ પશુચિકિત્સા હોસ્પિટલ — સંપૂર્ણપણે મફત.'
              )}</p>
              <p className="note">{t(lang,
                'Plot 468, Fulpura Gam Road, Valad, Gandhinagar – 382355',
                'પ્લોટ ૪૬૮, ફુલપુરા ગામ રોડ, વાલાડ, ગાંધીનગર – ૩૮૨૩૫૫'
              )}</p>
            </div>
            <div className="abl g">
              <h3>🚑 {t(lang, 'Mobile Clinic (Ambulances)', 'મોબાઇલ ક્લિનિક (એમ્બ્યુલન્સ સેવા)')}</h3>
              <p>{t(lang,
                '3 ambulances including a hydraulic Bolero for large animals. Our vets travel to the animal\'s location anywhere in Ahmedabad — fast and free.',
                'મોટા પશુઓ માટે હાઇડ્રોલિક બોલેરો સહિત ૩ એમ્બ્યુલન્સ. અમારા વેટરિનરી ડોક્ટરો અમદાવાદમાં ક્યાંય પણ પ્રાણીના સ્થળે પહોંચી જાય છે — ઝડપી અને મફત.'
              )}</p>
            </div>
            <div className="abl n">
              <h3>🐦 {t(lang, 'Bird Rescue & Uttarayan Camp', 'પક્ષી બચાવ અને ઉત્તરાયણ કેમ્પ')}</h3>
              <p>{t(lang,
                'Emergency camps during Makar Sankranti for birds injured by manja strings — hundreds saved every year through on-the-spot surgery and care.',
                'મકર સંક્રાંતિ દરમિયાન માજા દોરાથી ઇજાગ્રસ્ત પક્ષીઓ માટે ઇમરજન્સી કેમ્પ — દર વર્ષે સ્થળ પર જ સર્જરી અને સારવાર દ્વારા સૈંકડો પક્ષીઓ બચાવવામાં આવે છે.'
              )}</p>
            </div>
          </div>
          <div ref={rvr.ref} className={`rvr${rvr.visible ? ' in' : ''}`}>
            <div className="info-panel">
              <div className="ip-head">
                <h3>{t(lang, 'Trust Details', 'ટ્રસ્ટ વિગતો')}</h3>
                <p>{t(lang, 'Registration, Contact & Credentials', 'નોંધણી, સંપર્ક અને પ્રમાણપત્રો')}</p>
              </div>
              <div className="ip-row">
                <div className="ip-ico">📋</div>
                <div className="ip-kv"><strong>Reg. No.</strong><span>E/22904/AHMEDABAD</span></div>
              </div>
              <div className="ip-row">
                <div className="ip-ico">🆔</div>
                <div className="ip-kv"><strong>PAN</strong><span>AAETB1212F</span></div>
              </div>
              <div className="ip-row">
                <div className="ip-ico">📍</div>
                <div className="ip-kv">
                  <strong>{t(lang, 'Hospital Address', 'હોસ્પિટલ સરનામુ')}</strong>
                  <p>{t(lang,
                    'Plot 468, Fulpura Gam Road, Valad, Nana Chiloda, Gandhinagar – 382355',
                    'પ્લોટ ૪૬૮, ફુલપુરા ગામ રોડ, વાલાડ, નાના ચિલોડા, ગાંધીનગર – ૩૮૨૩૫૫'
                  )}</p>
                </div>
              </div>
              <div className="ip-row">
                <div className="ip-ico">📧</div>
                <div className="ip-kv"><strong>Email</strong><span>bezubancharitabletrust@gmail.com</span></div>
              </div>
              <div className="ip-row">
                <div className="ip-ico">📱</div>
                <div className="ip-kv">
                  <strong>{t(lang, 'Social Media', 'Social')}</strong>
                  <span>@bezuban_charitable_trust</span>
                </div>
              </div>
              <div className="cert-row">
                <div className="cert s">80-G (5)</div>
                <div className="cert g">CSR</div>
                <div className="cert n">Tax Exempt</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
