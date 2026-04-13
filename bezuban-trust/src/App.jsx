import { useState, useEffect } from 'react';
import './App.css';
import { LanguageProvider } from './context/LanguageContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Activities from './components/Activities';
import Statistics from './components/Statistics';
import Donate from './components/Donate';
import Contact from './components/Contact';
import Footer from './components/Footer';

const DEFAULT_HERO_STATS = [
  { value: '10,555+', label: { en: 'On-Site Treatments', gt: 'સ્થળ પર સારવાર' } },
  { value: '6,031+', label: { en: 'Hospital Treatments', gt: 'હોસ્પિટલમાં સારવાર' } },
  { value: '3', label: { en: 'Ambulances', gt: 'એમ્બ્યુલન્સ સેવા' } },
  { value: '7+', label: { en: 'Years of Service', gt: 'સેવાના વર્ષો' } },
];

const DEFAULT_MAIN_STATS = [
  { value: '4,600', category: { en: 'On-Site', gt: 'સ્થળ પર' }, subCategory: { en: 'Cattle', gt: 'પશુઓ' } },
  { value: '5,582', category: { en: 'On-Site', gt: 'સ્થળ પર' }, subCategory: { en: 'Animals', gt: 'પ્રાણીઓ' } },
  { value: '90',    category: { en: 'On-Site', gt: 'સ્થળ પર' }, subCategory: { en: 'Birds', gt: 'પક્ષીઓ' } },
  { value: '1,438', category: { en: 'Hospital', gt: 'હોસ્પિટલ' }, subCategory: { en: 'Cattle', gt: 'પશુઓ' } },
  { value: '969',   category: { en: 'Hospital', gt: 'હોસ્પિટલ' }, subCategory: { en: 'Animals', gt: 'પ્રાણીઓ' } },
  { value: '3,624', category: { en: 'Hospital', gt: 'હોસ્પિટલ' }, subCategory: { en: 'Birds', gt: 'પક્ષીઓ' } },
];

export default function App() {
  const [heroStats, setHeroStats] = useState(DEFAULT_HERO_STATS);
  const [mainStats, setMainStats] = useState(DEFAULT_MAIN_STATS);

  useEffect(() => {
    fetch('/config.json')
      .then(r => r.json())
      .then(data => {
        if (data.heroStats?.length) setHeroStats(data.heroStats);
        if (data.mainStats?.length) setMainStats(data.mainStats);
      })
      .catch(() => {});
  }, []);

  return (
    <LanguageProvider>
      <Navbar />
      <Hero stats={heroStats} />
      <About />
      <Activities />
      <Statistics stats={mainStats} />
      <Donate />
      <Contact />
      <Footer />
      <a href="tel:8866421316" className="floating-help" aria-label="Emergency Helpline">
        📞 <span>Emergency Helpline</span><span className="dot" />
      </a>
    </LanguageProvider>
  );
}
