import type { Dict } from '@/content/types';
import { loadPlans } from '@/lib/plans';
import { LandingMotion } from './LandingMotion';
import { LandingNav } from './LandingNav';
import { PricingTable } from './PricingTable';
import { ArabicSection, CTA, Features, Flow, Footer, Hero, Steps } from './sections';
import { cx } from './Icon';

/** The landing page (LandingExperience in the design system), in either language. */
export async function LandingPage({ t }: { t: Dict }) {
  const { plans, source } = await loadPlans();
  const other = t.lang === 'ar' ? '/' : '/ar';
  return (
    <div className={cx('pz-landing', t.lang === 'ar' && 'is-ar')} data-landing>
      <a className="pz-skip" href="#main">
        {t.skip}
      </a>
      <LandingNav t={t} altHref={other} />
      <main id="main">
        <Hero t={t} />
        <Flow t={t} />
        <Features t={t} />
        <Steps t={t} />
        <ArabicSection t={t} />
        <section className="pz-lsec" id="pricing" aria-labelledby="pricing-title">
          <div className="pz-lsec-head" data-reveal>
            <h2 id="pricing-title" className="title-1">
              {t.pricing.sectionTitle}
            </h2>
            <p className="pz-lsec-sub">{t.pricing.sectionSub}</p>
          </div>
          <div data-reveal>
            <PricingTable p={t.pricing} lang={t.lang} numberLocale={t.numberLocale} plans={plans} source={source} compare={false} compareHref={`${t.base}/pricing`} />
          </div>
        </section>
        <CTA t={t} />
      </main>
      <Footer t={t} />
      <LandingMotion rtl={t.dir === 'rtl'} />
    </div>
  );
}

/** The pricing page: tiers, the full compare table and the FAQ. */
export async function PricingPage({ t }: { t: Dict }) {
  const { plans, source } = await loadPlans();
  const pricingHref = `${t.base}/pricing`;
  const other = t.lang === 'ar' ? '/pricing' : '/ar/pricing';
  return (
    <div className={cx('pz-landing', t.lang === 'ar' && 'is-ar')}>
      <a className="pz-skip" href="#main">
        {t.skip}
      </a>
      <LandingNav t={t} altHref={other} current={pricingHref} />
      <main id="main">
        <header className="pz-phead">
          <div className="pz-lsec-head">
            <h1 className="display">{t.pricing.pageTitle}</h1>
            <p className="pz-lsec-sub">{t.pricing.pageSub}</p>
          </div>
        </header>
        <section className="pz-lsec" aria-label={t.pricing.pageTitle} style={{ paddingTop: 40 }}>
          <PricingTable p={t.pricing} lang={t.lang} numberLocale={t.numberLocale} plans={plans} source={source} />
        </section>
        <CTA t={t} />
      </main>
      <Footer t={t} />
    </div>
  );
}
