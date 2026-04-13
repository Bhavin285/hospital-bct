import { useLang, t } from '../context/LanguageContext';
import { useReveal } from '../hooks/useReveal';

const cards = [
  {
    ico: '🆘', variant: '',
    en: { title: 'Rescue Operations', sub: 'Drains · Wells · Trees · Anywhere', desc: 'Animals trapped in drains, wells, pits, trees, canals and construction sites are safely rescued by our trained team using specialised equipment.' },
    gu: { title: 'બચાવ કામગીરી', sub: 'ડ્રેઇન્સ · કૂવા · ઝાડ · ક્યાંય પણ', desc: 'ડ્રેઇન, કૂવા, ગટ્ટા, ઝાડ, નહેરો અને બાંધકામ સ્થળોમાં ફસાયેલા પ્રાણીઓ trained ટીમ દ્વારા વિશેષ સાધનોનો ઉપયોગ કરીને સુરક્ષિત રીતે બચાવવામાં આવે છે.' },
  },
  {
    ico: '🚐', variant: 'gv',
    en: { title: 'Mobile Veterinary Clinic', sub: 'On-site treatment anywhere in Ahmedabad', desc: 'Our mobile health van carries a skilled doctor team directly to the animal\'s location — no transport needed. Fast, free, and thorough on-spot care.' },
    gu: { title: 'મોબાઇલ વેટરિનરી ક્લિનિક', sub: 'અમદાવાદમાં ક્યાંય પણ સ્થળ પર સારવાર', desc: 'અમારી મોબાઇલ હેલ્થ વેન કુશળ ડોક્ટર ટીમને સીધા પ્રાણીના સ્થળે લઈ જાય છે — કોઈ પરિવહનની જરૂર નથી. ઝડપી, મફત અને સ્થળ પર સંપૂર્ણ સારવાર.' },
  },
  {
    ico: '🏥', variant: 'nv',
    en: { title: 'Hospital & Surgery', sub: 'Modern OT · Hydraulic Table · Physio', desc: 'Complex surgeries — tumour removal, fracture plating, eye operations, physiotherapy — performed by expert vets at zero cost.' },
    gu: { title: 'હોસ્પિટલ અને સર્જરી', sub: 'આધુનિક ઓટી · હાઇડ્રોલિક ટેબલ · ફિઝિયો', desc: 'જટિલ સર્જરીઓ — ટ્યુમર દૂર કરવી, ફ્રેક્ચર પ્લેટિંગ, આંખના ઓપરેશન, ફિઝિયોથેરાપી — નિષ્ણાત વેટરિનરી ડોક્ટરો દ્વારા શૂન્ય ખર્ચે.' },
  },
  {
    ico: '🐦', variant: '',
    en: { title: 'Bird Rescue (Uttarayan)', sub: 'Makar Sankranti Emergency Camps', desc: 'During Makar Sankranti thousands of birds are injured by manja strings. We run emergency camps and perform surgeries to save hundreds each year.' },
    gu: { title: 'પક્ષી બચાવ (ઉત્તરાયણ)', sub: 'મકર સંક્રાંતિ ઇમરજન્સી કેમ્પ', desc: 'મકર સંક્રાંતિ દરમિયાન હજારો પક્ષીઓ માજા દોરથી ઇજાગ્રસ્ત થાય છે. અમે ઇમરજન્સી કેમ્પ ચલાવીએ છીએ અને દર વર્ષે સૈંકડો પક્ષીઓ બચાવવા સર્જરી કરીએ છીએ.' },
  },
  {
    ico: '🐄', variant: 'gv',
    en: { title: 'Large Animal Rescue', sub: 'Hydraulic Bolero Ambulance', desc: 'Our hydraulic Bolero ambulance specially lifts and transports cows, bulls and large animals with fractures or accident injuries for treatment.' },
    gu: { title: 'મોટા પ્રાણીઓ બચાવ', sub: 'હાઇડ્રોલિક બોલેરો એમ્બ્યુલન્સ', desc: 'અમારી હાઇડ્રોલિક બોલેરો એમ્બ્યુલન્સ ખાસ કરીને ગાય, બળદ અને ફ્રેક્ચર અથવા અકસ્માત ઇજાઓવાળા મોટા પ્રાણીઓને ઉપાડીને સારવાર માટે લઈ જાય છે.' },
  },
  {
    ico: '💧', variant: 'nv',
    en: { title: 'Community Care', sub: 'Feeding · Water Bowls · Vaccination', desc: 'Free water bowls for birds in summer, daily grain at the hospital, booster vaccines for rescued animals, and special feeding on religious occasions.' },
    gu: { title: 'સમુદાય સેવા', sub: 'ખોરાક · પાણીના બાઉલ · રસીકરણ', desc: 'ગરમીમાં પક્ષીઓ માટે મફત પાણીના બાઉલ, હોસ્પિટલમાં રોજનું અનાજ, બચાવેલા પ્રાણીઓ માટે બૂસ્ટર રસી, અને ધાર્મિક પ્રસંગો પર વિશેષ ખોરાક.' },
  },
];

function Card({ card }) {
  const { lang } = useLang();
  const rv = useReveal();
  const data = lang === 'en' ? card.en : card.gu;
  return (
    <div ref={rv.ref} className={`acard${card.variant ? ' ' + card.variant : ''} rv${rv.visible ? ' in' : ''}`}>
      <span className="a-ico">{card.ico}</span>
      <h3>{data.title}</h3>
      <p className={`sub${card.variant === 'gv' ? ' g' : ''}`}>{data.sub}</p>
      <p>{data.desc}</p>
    </div>
  );
}

export default function Activities() {
  const { lang } = useLang();
  const hdr = useReveal();

  return (
    <section id="activities" className="sec sec-white">
      <div className="container">
        <div ref={hdr.ref} className={`act-hdr rv${hdr.visible ? ' in' : ''}`}>
          <div className="chip g">{t(lang, 'What We Do', 'અમે શું કરીએ છીએ')}</div>
          <h2 className="s-head">{t(lang, 'Our Life-Saving Activities', 'અમારી જીવ બચાવવાની પ્રવૃત્તિઓ')}</h2>
          <p className="s-desc">
            {t(lang,
              'From rescuing animals trapped in wells and drains to performing complex surgeries — our team is available 24/7 for every voiceless creature.',
              'રાંદેર અને નાળામાં ફસાયેલા પ્રાણીઓને બચાવવાથી લઈને જટિલ સર્જરી સુધી — અમારી ટીમ દરેક બેઝુબાન જીવ માટે ૨૪/૭ ઉપલબ્ધ છે.'
            )}
          </p>
        </div>
        <div className="act-grid">
          {cards.map((c, i) => <Card key={i} card={c} />)}
        </div>
      </div>
    </section>
  );
}
