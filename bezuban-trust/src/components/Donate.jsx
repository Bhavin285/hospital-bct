import { useLang, t } from '../context/LanguageContext';
import { useReveal } from '../hooks/useReveal';

const schemes = [
  {
    en: { name: 'Bezuban Akshay Kosh — Permanent Reserve Fund', note: '(Name listed permanently, only interest used)' },
    gu: { name: 'બેઝુબાન અક્ષય કોષ — સ્થાયી રિઝર્વ ફંડ', note: '(નામ સ્થાયી રીતે સૂચિબદ્ધ રહેશે, ફક્ત વ્યાજ ઉપયોગ થાય છે)' },
    amount: '₹1,00,000',
  },
  {
    en: { name: 'Hospital Operations — Monthly Primary Benefactor', note: '(Name on hospital board for the month)' },
    gu: { name: 'હોસ્પિટલ સંચાલન — માસિક પ્રાઇમરી લાભાર્થી', note: '(મહિના માટે હોસ્પિટલ બોર્ડ પર નામ)' },
    amount: '₹51,000',
  },
  {
    en: { name: 'Annual Hospital Sponsor', note: '(Name on hospital signboard for 1 year)' },
    gu: { name: 'વાર્ષિક હોસ્પિટલ પ્રાયોજક', note: '(૧ વર્ષ માટે હોસ્પિટલ સાઇનબોર્ડ પર નામ)' },
    amount: '₹21,000',
  },
  {
    en: { name: 'General Donation', note: 'Any amount helps' },
    gu: { name: 'સામાન્ય દાન', note: 'કોઈ પણ રકમ મદદ કરે છે' },
    amount: '₹ Any',
  },
];

export default function Donate() {
  const { lang } = useLang();
  const hdr = useReveal();
  const grid = useReveal();

  return (
    <section id="donate" className="don-wrap">
      <div className="don-bg" />
      <div className="don-in">
        <div ref={hdr.ref} className={`don-hdr rv${hdr.visible ? ' in' : ''}`}>
          <div className="chip">{t(lang, 'Support Our Mission', 'અમારા મિશનને સમર્થન આપો')}</div>
          <h2 className="s-head">{t(lang, 'Donate to Save a Voiceless Life', 'બેઝુબાન જીવ બચાવવા દાન આપો')}</h2>
          <p className="s-desc">
            {t(lang,
              'Every rupee you donate keeps our hospital running, ambulances fuelled, and animals alive. Your support is a blessing from a voiceless creature.',
              'તમે આપેલો દરેક રૂપિયા અમારી હોસ્પિટલ ચાલુ રાખવામાં, એમ્બ્યુલન્સનું ઇંધણ પુરું પાડવામાં અને પ્રાણીઓ જીવિત રહેવામાં મદદ કરે છે. તમારું સમર્થન બેઝુબાન જીવ તરફથી એક આશીર્વાદ છે.'
            )}
          </p>
        </div>
        <div ref={grid.ref} className={`don-grid rv${grid.visible ? ' in' : ''}`}>
          <div className="dcard">
            <h3>🏦 {t(lang, 'Bank Transfer Details', 'બૅંક ટ્રાન્સફર વિગતો')}</h3>
            {[
              { k: t(lang, 'Account Name', 'એકાઉન્ટનું નામ'), v: 'Bezuban Charitable Trust' },
              { k: t(lang, 'Bank', 'બૅંક'), v: 'State Bank of India' },
              { k: t(lang, 'Branch', 'શાખા'), v: 'Sardarnagar, Ahmedabad' },
              { k: t(lang, 'Account No.', 'ખાતા નંબર'), v: '39597419705', code: true },
              { k: 'IFSC', v: 'SBIN0016029', code: true },
            ].map((row, i) => (
              <div key={i} className="br">
                <span className="br-k">{row.k}</span>
                <span className={`br-v${row.code ? ' code' : ''}`}>{row.v}</span>
              </div>
            ))}
            <div className="cert-strip">
              <div className="ctag">
                <div className="ctag-n">80-G</div>
                <div className="ctag-l">{t(lang, 'Tax Exemption', 'ટેક્સ મુક્તિ')}</div>
              </div>
              <div className="ctag">
                <div className="ctag-n">CSR</div>
                <div className="ctag-l">{t(lang, 'CSR Eligible', 'સીએસઆર લાયક')}</div>
              </div>
            </div>
            <p className="don-note">
              {t(lang,
                'Please make cheque / draft in favour of "Bezuban Charitable Trust"',
                'ચેક/ડ્રાફ્ટ \'બેઝુબાન ચેરિટેબલ ટ્રસ્ટ\' ના નામ પર મોકલવો'
              )}
            </p>
          </div>
          <div className="dcard">
            <h3>🌟 {t(lang, 'Donation Schemes', 'દાન યોજનાઓ')}</h3>
            <div className="schemes">
              {schemes.map((s, i) => {
                const d = lang === 'en' ? s.en : s.gu;
                return (
                  <div key={i} className="scheme">
                    <div className="sch-l">
                      {d.name}
                      <span className="gn">{d.note}</span>
                    </div>
                    <span className="sch-a">{s.amount}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
