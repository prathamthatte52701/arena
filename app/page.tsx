import Link from 'next/link';
import styles from './home.module.css';
export default function Home() { return <main className={styles.home}><div className={styles.glow}/><p className={styles.kicker}>PROMO QUEENS · CINEMATIC PERFORMANCE</p><h1>Say it.<br/><em>Own the room.</em></h1><p className={styles.lede}>Type your promo. Rhea delivers every word with attitude, expression and a camera that knows the moment.</p><Link className={styles.cta} href="/promo-rhea">START PROMO <span>→</span></Link><p className={styles.meta}>RHEA / BACKSTAGE INTERVIEW · LOCAL EXPERIENCE</p></main>; }
