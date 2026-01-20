import React, { useState } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import rice_varities from "../assets/rice_varities.jpg";
import rice_packing from "../assets/rice_packing.jpg";
import sella_diff from "../assets/sella_diff.jpg";
import rice_mills from "../assets/rice_mills.jpg";
import light_dark from "../assets/light_dark.jpg";
import diff_raw_steam from "../assets/diff_raw_steam.jpg";
import mill from "../assets/mill.jpg";
import { useLanguage } from "../contexts/LanguageContext";

const Blog = () => {
  const [selectedPost, setSelectedPost] = useState(null);
  const { t } = useLanguage();

  const blogPosts = [
    {
      title: t("indian_rice_varieties_title"),
      excerpt: t("indian_rice_varieties_excerpt"),
      image: rice_varities,
      content: (
        <>
          <p>{t("rice_varieties_intro")}</p>
          <p>{t("rice_varieties_guide")}</p>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("premium_basmati_varieties")}</h2>
          <h3>1. 1121 Basmati Rice</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Average grain length: 8.30–8.40 mm (before cooking)</li>
            <li>Elongation ratio: 2.0–2.5x after cooking</li>
            <li>Known as the longest grain basmati rice in the world</li>
            <li>Exceptional elongation after cooking, rich aroma, and delicate taste</li>
            <li>Preferred by luxury retail brands, five-star hotels, and fine dining restaurants</li>
          </ul>
          <h3>2. 1718 Basmati Rice</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Average grain length: 8.30–8.40 mm (before cooking)</li>
            <li>Elongation ratio: 1.8–2.0x after cooking</li>
            <li>Closely matches 1121 in aroma and cooking style</li>
            <li>Slightly shorter in grain but more economical</li>
            <li>Gaining popularity in both retail packs and wholesale export markets</li>
          </ul>
          <h3>3. 1401 Basmati Rice</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Average grain length: 7.60–7.80 mm</li>
            <li>Elongation ratio: 2.0–2.4x after cooking</li>
            <li>Moderate grain length and aroma</li>
            <li>Well-suited for bulk exports, catering, and everyday retail packs</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("mid_segment_basmati_varieties")}</h2>
          <h3>1. 1509 Basmati Rice</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Average grain length: 8.30–8.40 mm (before cooking)</li>
            <li>Elongation ratio: 2.2–2.7x after cooking</li>
            <li>Lighter grain than 1121 but still aromatic</li>
            <li>Widely exported due to its balance of price and quality</li>
            <li>Popular among restaurants, catering services, and mid-value retailers</li>
          </ul>
          <h3>2. PUSA Basmati</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Average grain length: 7.40–7.50 mm (before cooking)</li>
            <li>Elongation ratio: 2.0–2.4x after cooking</li>
            <li>Earlier developed variety of basmati</li>
            <li>Offers good aroma and cooking performance at a lower price point</li>
            <li>Used by economy retail brands and mid-range restaurants</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("mass_market_rice_varieties")}</h2>
          <h3>1. Sugandha Rice</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Average grain length: 7.80–8.00 mm</li>
            <li>Elongation ratio: 1.7–2.2x after cooking</li>
            <li>Aromatic non-basmati rice, often marketed as a basmati alternative</li>
            <li>Very popular in bulk supply, mid-tier restaurants, and catering businesses</li>
          </ul>
          <h3>2. Taj Rice</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Average grain length: 8.00–8.10 mm</li>
            <li>Elongation ratio: 1.8–2.0x after cooking</li>
            <li>Budget-friendly non-basmati variety</li>
            <li>Commonly used in household consumption, small retailers, and catering</li>
          </ul>
          <h3>3. RH10 Rice</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Average grain length: 7.30–7.50 mm</li>
            <li>Elongation ratio: 1.8–2.0x after cooking</li>
            <li>Low-cost non-basmati rice</li>
            <li>Primarily exported for institutional catering, foodservice, and wholesale</li>
          </ul>
          <h3>4. Sharbati Rice</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Average grain length: 7.00–7.10 mm</li>
            <li>Elongation ratio: 1.8–2.0x after cooking</li>
            <li>Non-basmati, long-grain rice with mild aroma</li>
            <li>Affordable choice for households, retail brands, and foodservice</li>
          </ul>
          <h3>5. PR 11/14 Rice</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Average grain length: 6.70–6.90 mm</li>
            <li>Elongation ratio: 1.7–1.9x after cooking</li>
            <li>Non-basmati, medium-quality grains</li>
            <li>Used in canteens, mid-budget catering, and wholesale supply</li>
          </ul>
          <h3>6. PR 106/47 Rice</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Average grain length: 6.30–6.50 mm</li>
            <li>Elongation ratio: 1.7–1.9x after cooking</li>
            <li>Entry-level budget rice variety</li>
            <li>Primarily used in labor camps, institutional catering, and mass meal programs</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("why_buyers_choose_indian_rice")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li><strong>{t("quality_aroma")} : </strong> Indian basmati rice is globally recognized for its aroma and long grains.</li>
            <li><strong>{t("wide_range")} : </strong> From luxury basmati to budget non-basmati, there’s a variety for every market.</li>
            <li><strong>{t("strong_export_network")} : </strong> India has a well-established supply chain ensuring timely delivery worldwide.</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("conclusion")}</h2>
          <p>If you are planning to import rice from India, understanding the differences between rice varieties can help you select the right type for your target customers. While 1121, 1718, and 1401 Basmati serve the premium market, 1509 and PUSA Basmati cater to mid-segment buyers, and Sugandha, Taj, RH10, Sharbati, PR 11/14, and PR 106/47 provide cost-effective solutions for the mass market.</p>
          <p>By sourcing the right variety, importers and distributors can maximize customer satisfaction while staying competitive in price and quality.</p>
        </>
      ),
    },
    {
      title: t("rice_packaging_title"),
      excerpt: t("rice_packaging_excerpt"),
      image: rice_packing,
      content: (
        <>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("posted_by")}</h2>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("table_of_contents")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>{t("pp_woven_bags")}</li>
            <li>{t("non_woven_bags")}</li>
            <li>{t("jute_bags")}</li>
            <li>{t("bopp_laminated_bags")}</li>
            <li>{t("ldpe_pouches")}</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("pp_woven_bags")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li><strong>{t("structure")} : </strong> Made of woven polypropylene tapes.</li>
            <li><strong>{t("strength")} : </strong> High tensile strength, tear resistant, good for heavy loads (5–50 kg).</li>
            <li><strong>{t("moisture_resistance")} : </strong> Moderate, can allow some air exchange unless laminated.</li>
            <li><strong>{t("printing")} : </strong> Flexographic printing possible, but limited graphics.</li>
            <li><strong>{t("recyclability")} : </strong> Fully recyclable.</li>
            <li><strong>{t("common_use")} : </strong> Standard bulk rice packaging (25/50 kg).</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("non_woven_bags")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li><strong>{t("structure")} : </strong> Fabric made from spun-bonded polypropylene fibers (not woven).</li>
            <li><strong>{t("strength")} : </strong> Lighter weight, less tensile strength compared to woven PP.</li>
            <li><strong>{t("moisture_resistance")} : </strong> Better than jute, but lower than laminated BOPP/LDPE.</li>
            <li><strong>{t("printing")} : </strong> High-quality multicolor printing possible.</li>
            <li><strong>{t("recyclability")} : </strong> Recyclable, considered more eco-friendly than plastic film bags.</li>
            <li><strong>{t("common_use")} : </strong> Retail packs (5–10 kg), promotional packs.</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("jute_bags")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li><strong>{t("structure")} : </strong> Natural fiber from jute plant, woven into fabric.</li>
            <li><strong>{t("strength")} : </strong> Very strong, breathable, good for large capacities.</li>
            <li><strong>{t("moisture_resistance")} : </strong> Poor against water, absorbs moisture.</li>
            <li><strong>{t("printing")} : </strong> Limited to simple stenciling or basic ink printing.</li>
            <li><strong>{t("recyclability")} : </strong> 100% biodegradable and compostable.</li>
            <li><strong>{t("common_use")} : </strong> Traditional bulk packaging, premium or export branding where sustainability is emphasized.</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("bopp_laminated_bags")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li><strong>{t("structure")} : </strong> PP woven bag laminated with a printed BOPP film layer.</li>
            <li><strong>{t("strength")} : </strong> Combines strength of PP woven + barrier of BOPP film.</li>
            <li><strong>{t("moisture_resistance")} : </strong> Excellent, protects against humidity and spillage.</li>
            <li><strong>{t("printing")} : </strong> High-definition rotogravure printing (multicolor, photographic).</li>
            <li><strong>{t("recyclability")} : </strong> Technically recyclable, though multilayer separation is a challenge.</li>
            <li><strong>{t("common_use")} : </strong> Branded rice packaging (5–25 kg), retail and export markets.</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("ldpe_pouches")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li><strong>{t("structure")} : </strong> Film-based pouches made from LDPE, can be mono-layer or multi-layer.</li>
            <li><strong>{t("strength")} : </strong> Flexible, but weaker mechanical strength compared to woven bags. Suited for smaller packs.</li>
            <li><strong>{t("moisture_resistance")} : </strong> Excellent barrier to moisture and dust.</li>
            <li><strong>{t("printing")} : </strong> High-quality multicolor printing possible.</li>
            <li><strong>{t("recyclability")} : </strong> Recyclable depending on mono/multi-layer structure.</li>
            <li><strong>{t("common_use")} : </strong> Retail packs (1–5 kg), vacuum packing, stand-up pouches.</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("summary")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li><strong>PP woven:</strong> Best for bulk, economical.</li>
            <li><strong>Non-woven:</strong> Mid-range, light, attractive.</li>
            <li><strong>Jute:</strong> Eco-friendly, premium image.</li>
            <li><strong>BOPP laminated:</strong> Strong + best print quality, retail branding.</li>
            <li><strong>LDPE pouch:</strong> Small retail packs, strong moisture barrier.</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("summary_with_cost_logic")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li><strong>{t("lowest_cost")} : </strong> PP woven (bulk commodity packs).</li>
            <li><strong>{t("mid_cost")} : </strong> Non-woven & LDPE (retail focus).</li>
            <li><strong>{t("premium")} : </strong> BOPP laminated (best branding) and Jute (eco-premium image).</li>
          </ul>
        </>
      ),
    },
    {
      title: t("sella_diff_title"),
      excerpt: t("sella_diff_excerpt"),
      image: sella_diff,
      content: (
        <>
          <p>In the world of premium long-grain rice, Basmati holds a distinctive position for its unique aroma, extra-long grains, and non-sticky post-cooking texture. Among its many variants, Sella Basmati Rice—also known as parboiled Basmati—comes in two popular forms: White Sella and Creamy Sella.</p>
          <p>Though both are produced using the same parboiling process, they differ in appearance, processing, and market preferences. Here’s a comprehensive breakdown to help you choose the right variant for your market or kitchen.</p>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("what_is_sella_basmati")}</h2>
          <p>Sella Basmati Rice is made by parboiling paddy rice (in husk) before milling. This process:</p>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Hardens the grain</li>
            <li>Retains more nutrients</li>
            <li>Enhances shelf life</li>
            <li>Improves elongation during cooking</li>
            <li>Depending on the steam intensity and drying method, the rice takes on a white or creamy/golden color.</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("which_one_to_choose")}</h2>
          <h3>{t("choose_white_sella")}</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>You need rice for branded packaging or private labels</li>
            <li>Your market prefers bright, white grains with polished finish</li>
            <li>You’re targeting modern retailers and fine dining</li>
          </ul>
          <h3>{t("choose_creamy_sella")}</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>You cater to traditional cuisines like biryani, pulao, or mandi</li>
            <li>You’re exporting to Gulf, East Africa, or Central Asia</li>
            <li>You want a richer, authentic appearance and aroma</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("exporters_desk")}</h2>
          <p>At Sai Imports Exports Agro Rice Mills, we supply both White Sella and Creamy Sella Basmati Rice with:</p>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Consistent extra-long grain size</li>
            <li>Double sorting & polishing</li>
            <li>Certified quality</li>
            <li>Custom packing (1kg to 50kg)</li>
          </ul>
          <p>We understand that even small differences in grain appearance or cooking behaviour matter greatly to regional markets — and we help our buyers match the right variety to their customer expectations.</p>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("final_thoughts")}</h2>
          <p>Both White Sella and Creamy Sella Basmati offer exceptional quality, aroma, and grain length. The right choice depends on your target market, cooking application, and branding requirements.</p>
          <p>Work with an experienced supplier who understands the nuances of international rice preferences — and can deliver consistency, batch after batch.</p>
        </>
      ),
    },
    {
      title: t("rice_mills_title"),
      excerpt: t("rice_mills_excerpt"),
      image: rice_mills,
      content: (
        <>
          <p>When it comes to importing Basmati rice into European Union (EU) countries, buyers are expected to comply with some of the strictest food safety and quality regulations in the world. As an EU-certified Basmati rice exporter from India, Sai Imports Exports Agro Rice Mills (SKRM) meets and exceeds those standards — delivering premium long-grain Basmati rice to buyers across Europe with full regulatory compliance.</p>
          <p>Whether you are a food importer, distributor, retail brand, or private-label business in the EU, partnering with SKRM ensures quality assurance, legal compliance, and commercial reliability.</p>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("about_siea_rice_mills")}</h2>
          <p>Sai Imports Exports Agro Rice Mills (SKRM) is a leading manufacturer and exporter of premium-grade Indian Basmati rice, located in Karnal, Haryana — the heartland of India’s Basmati cultivation.</p>
          <p>With over 25 years of experience in milling and exporting rice, we specialize in:</p>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>1121 Basmati Rice (White Sella, Creamy Sella, Steam, Raw)</li>
            <li>1509, 1718, Sugandha, and Sharbati rice varieties</li>
            <li>Custom packaging solutions for retail, wholesale, and foodservice</li>
            <li>Private label manufacturing for international brands</li>
            <li>EU Certification & Compliance</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("what_makes_skrm_eu_compliant")}</h2>
          <p>To export food products into the EU, suppliers must meet comprehensive requirements around food safety, traceability, packaging, and pesticide residue limits (MRLs). At SKRM, we strictly comply with:</p>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>European Commission food safety regulations</li>
            <li>Maximum Residue Limits (MRL) set by EFSA (European Food Safety Authority)</li>
            <li>EU traceability and labeling norms</li>
            <li>GMP & HACCP-certified processing</li>
            <li>ISO 22000-certified food safety management system</li>
            <li>Regular batch testing for pesticides, heavy metals, and aflatoxins by NABL-accredited labs</li>
          </ul>
          <p>We also ensure all exports are accompanied by:</p>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Phytosanitary certificates</li>
            <li>EU-compliant test reports</li>
            <li>Full batch traceability</li>
            <li>Non-GMO declarations</li>
            <li>Custom packaging & labeling per EU country requirements</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("what_sets_skrm_apart")}</h2>
          <h3>1. {t("infrastructure_processing")}</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>In-house parboiling, steaming, drying, polishing & packaging units</li>
            <li>Fully automated Sortex & Grader lines</li>
            <li>Clean-room packaging systems for retail & export</li>
            <li>Separate EU-dedicated rice storage zones</li>
            <li>In-house lab for moisture, broken %, elongation, purity & aging verification</li>
          </ul>
          <h3>2. {t("export_experience")}</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>100+ containers shipped annually to Germany, Netherlands, France, UK, Italy, Spain, Poland, and Czech Republic</li>
            <li>Direct export support from Nhava Sheva and Mundra ports</li>
            <li>Familiarity with EU customs documentation and sanitary requirements</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("trusted_by_european_importers")}</h2>
          <p>SKRM is a preferred supplier for:</p>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>German food wholesalers and ethnic grocery stores</li>
            <li>French supermarkets and Halal food distributors</li>
            <li>UK private-label Basmati rice brands</li>
            <li>Dutch and Belgian cash-and-carry stores</li>
            <li>Central and Eastern Europe food traders</li>
          </ul>
          <p>We support our partners with:</p>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Flexible MOQ & container loads</li>
            <li>Long-term pricing and contract supply</li>
            <li>EU-specific packaging design</li>
            <li>Quality certifications for retail registration</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("partner_with_exporter")}</h2>
          <p>If you’re looking for a reliable EU-approved Basmati rice supplier from India, SIEA Rice Mills offers:</p>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>World-class rice</li>
            <li>Compliant documentation</li>
            <li>Timely dispatch</li>
            <li>Transparent communication</li>
          </ul>
        </>
      ),
    },
    {
      title: t("light_dark_title"),
      excerpt: t("light_dark_excerpt"),
      image: light_dark,
      content: (
        <>
          <p>When sourcing premium Basmati rice, you may come across terms like Light Steam and Dark Steam — common variants, especially in the export of 1121, 1718, 1509, 1401 & PUSA Basmati Rice.</p>
          <p>Although both undergo steaming (parboiling) before milling, the difference lies in the degree of steaming, which significantly affects the rice’s color, aroma, grain texture, and cooking performance.</p>
          <p>In this article, we break down the key differences between Light Steam and Dark Steam Basmati to help you choose the right variety based on your market preferences and application needs.</p>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("what_is_steamed_basmati")}</h2>
          <p>Steamed Basmati rice is produced by partially boiling the paddy (un-milled rice) with steam before de-husking and milling. This process helps:</p>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Retain more nutrients</li>
            <li>Strengthen the grain structure</li>
            <li>Improve shelf life and aroma</li>
          </ul>
          <p>The intensity and duration of steaming determines whether the rice becomes Light Steam or Dark Steam.</p>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("market_insights")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>In Saudi Arabia, Yemen, and other Gulf and African regions, Dark Steam Basmati is preferred for its robustness and traditional color.</li>
            <li>In North America and Europe, Light Steam (also known as White Steam) is favored for its clean appearance and suitability in retail and modern trade.</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("when_to_choose")}</h2>
          <h3>{t("choose_light_steam")}</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>You target modern retail, supermarkets, or private labels</li>
            <li>Your buyers prefer whiter rice with polished grain</li>
            <li>You focus on ready-to-cook products or shorter cooking time</li>
          </ul>
          <h3>{t("choose_dark_steam")}</h3>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>You supply to bulk buyers, restaurants, or catering services</li>
            <li>Your customers value strong aroma, firm grain, and traditional appearance</li>
            <li>You need rice that holds well on buffets and long cooking</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("packaging_insight")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li><strong>Light Steam:</strong> Often packed in retail bags (1kg, 5kg, 10kg)</li>
            <li><strong>Dark Steam:</strong> Mostly supplied in bulk sacks (25kg, 50kg PP or jute bags)</li>
          </ul>
          <p>At Sai Imports Exports Agro Rice Mills, we supply both variants with:</p>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li>Customized branding</li>
            <li>Quality certifications</li>
            <li>On-time container loading & global logistics</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("final_thoughts")}</h2>
          <p>Whether you choose Light Steam or Dark Steam Basmati Rice, both are high-quality options offering long grain length, post-cooking elongation, and superior flavor. The difference lies in processing depth and regional preferences. Understanding your market’s needs is key to selecting the right variety — and the right supplier.</p>
        </>
      ),
    },
    {
      title: t("diff_raw_steam_title"),
      excerpt: t("diff_raw_steam_excerpt"),
      image: diff_raw_steam,
      content: (
        <>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("raw_basmati_rice")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li><strong>Processing:</strong> Milled directly after drying the harvested paddy; no steaming or parboiling.</li>
            <li><strong>Color:</strong> Bright white.</li>
            <li><strong>Grain Texture:</strong> Softer and more fragile.</li>
            <li><strong>Aroma:</strong> Strong natural basmati aroma.</li>
            <li><strong>Cooking Result:</strong> Fluffy, separate grains; softer texture.</li>
            <li><strong>Usage:</strong> Preferred for daily meals and traditional Indian cooking.</li>
            <li><strong>Shelf Life:</strong> Shorter compared to processed types.</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("steam_basmati_rice")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li><strong>Processing:</strong> Paddy is steamed before milling, but not parboiled.</li>
            <li><strong>Color:</strong> Off-white to greyish tint.</li>
            <li><strong>Grain Texture:</strong> Stronger than raw rice; less breakage.</li>
            <li><strong>Aroma:</strong> Mild natural aroma (less than raw).</li>
            <li><strong>Cooking Result:</strong> Long, separate, and firmer grains after cooking.</li>
            <li><strong>Usage:</strong> Used in hotels, restaurants for biryani and pulao.</li>
            <li><strong>Shelf Life:</strong> Longer than raw rice.</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("white_sella_basmati_rice")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li><strong>Processing:</strong> Parboiled (partially boiled in husk) and then milled; white color retained.</li>
            <li><strong>Color:</strong> Creamy white.</li>
            <li><strong>Grain Texture:</strong> Harder; minimal breakage.</li>
            <li><strong>Aroma:</strong> Mild; aroma reduced during parboiling.</li>
            <li><strong>Cooking Result:</strong> Non-sticky, firmer and longer grains.</li>
            <li><strong>Usage:</strong> Popular in Middle Eastern and export markets; good for catering.</li>
            <li><strong>Shelf Life:</strong> Long; resistant to pests and moisture.</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("golden_sella_basmati_rice")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li><strong>Processing:</strong> Parboiled like white sella but dried in a way that gives a golden hue.</li>
            <li><strong>Color:</strong> Golden yellow.</li>
            <li><strong>Grain Texture:</strong> Very hard and robust.</li>
            <li><strong>Aroma:</strong> Subtle aroma due to heavy processing.</li>
            <li><strong>Cooking Result:</strong> Long, fluffy, and firm grains; doesn’t break easily.</li>
            <li><strong>Usage:</strong> Widely used in commercial kitchens, biryanis, and export to Gulf countries.</li>
            <li><strong>Shelf Life:</strong> Very long; excellent storage stability.</li>
          </ul>
        </>
      ),
    },
    {
      title: t("mill_title"),
      excerpt: t("mill_excerpt"),
      image: mill,
      content: (
        <>
          <p>As a Basmati rice miller, I’ve spent years watching each grain pass through my machines—listening to the stories they tell. From the lush green paddy fields of Punjab and Haryana to the polished, aromatic grains packed for kitchens across the globe, every grain carries a journey of pride and pain. And while Basmati rice continues to be celebrated for its exquisite aroma and texture, the path from field to fork is becoming increasingly difficult.</p>
          <p>Here’s a ground-level view of the challenges we face today:</p>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("uncertain_yields")}</h2>
          <p>Many don’t realize this, but Basmati is a delicate crop. It needs time, water, and care. Farmers often choose it over high-yielding hybrid rice because of its export potential. But low yield, high input costs, and unpredictable weather make the decision risky. When yields fall short, it affects us millers directly. Low supply drives up raw paddy prices and squeezes our margins.</p>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("water_woes")}</h2>
          <p>Basmati thrives in water-rich conditions, but groundwater levels in our region are depleting rapidly. Climate change has only made things worse—unseasonal rains or early frost can damage an entire harvest. As millers, we can’t process what doesn’t arrive. The uncertainty makes it harder to plan procurement, storage, and exports.</p>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("export_pressures")}</h2>
          <p>Most of our Basmati rice is meant for international markets—Middle East, Europe, and North America. But we’ve seen consignments returned or rejected due to pesticide residue levels, especially in the EU. It’s frustrating because smallholder farmers don’t always have access to the right training or safe agri-chemicals. One mistake in the field can ruin an entire shipment at the port.</p>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("cost_of_compliance")}</h2>
          <p>Meeting export standards is getting harder and more expensive. Residue testing, certifications, fumigation, packaging, labelling—all add to our operational costs. And yet, international buyers constantly push for lower prices. We’re caught between rising production costs and falling selling prices.</p>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("lack_of_varieties")}</h2>
          <p>There’s an increasing problem with spurious seeds and inconsistent grain quality. Sometimes, paddy looks like Basmati but doesn’t meet aromatic or elongation standards after milling. As millers, we spend extra time and effort sorting and grading, and still face quality complaints from buyers. The lack of a standardized seed system is hurting the entire value chain.</p>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("stubble_burning")}</h2>
          <p>While farmers face penalties for stubble burning, we too bear indirect consequences. Delays in harvesting due to shifting weather and legal action over environmental violations can impact the entire supply timeline. A few years ago, delayed harvests meant we couldn’t fulfil orders on time during the Diwali and New Year export windows.</p>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("infrastructure_bottlenecks")}</h2>
          <p>Post-harvest losses are high. Many farmers still transport paddy in open trollies, exposing it to dust and moisture. Warehousing is limited, and even state-run procurement lacks coordination. We’ve invested heavily in modern milling machinery, but without a cold chain or proper drying infrastructure upstream, much of that quality gets lost before the grain even enters our gate.</p>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("what_can_be_done")}</h2>
          <ul className="tw-list-disc tw-pl-5 tw-mb-4">
            <li><strong>Better Extension Services:</strong> Educate farmers on safe pesticide use, optimal irrigation, and residue compliance.</li>
            <li><strong>Support for Milling Units:</strong> Subsidies for upgrading technology and meeting export regulations.</li>
            <li><strong>Seed Standardization:</strong> Ensure farmers have access to certified, high-quality Basmati seed varieties.</li>
            <li><strong>Price Stability Mechanisms:</strong> Reduce volatility through minimum support price (MSP) assurance or buffer stocking.</li>
            <li><strong>Export Facilitation:</strong> Streamline documentation, customs, and residue testing labs at ports.</li>
          </ul>
          <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mt-6 tw-mb-4">{t("final_thoughts")}</h2>
          <p>Every time you enjoy a plate of fragrant Basmati rice, remember the journey it took—from a farmer’s field to our mill to your plate. Behind that grain lies a community fighting to keep a tradition alive amidst mounting challenges. Let’s hope policy, industry, and consumers come together to protect what we millers hold so dear.</p>
        </>
      ),
    },
  ];

  return (
    <section className="tw-py-8 tw-bg-black/30 tw-backdrop-blur-sm tw-text-white">
      <div className="tw-container tw-mx-auto tw-px-4 sm:tw-px-6 lg:tw-px-8">
        <h1 className="tw-text-3xl tw-font-bold tw-text-yellow-400 tw-mb-8 tw-text-center">{t("blog")}</h1>
        {selectedPost === null ? (
          <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-6">
            {blogPosts.map((post, index) => (
              <div
                key={index}
                className="tw-bg-gray-900/80 tw-rounded-lg tw-p-6 tw-shadow-lg tw-border tw-border-yellow-400/50 tw-flex tw-flex-col tw-justify-between tw-transition-all tw-duration-300 tw-transform hover:tw-scale-105 hover:tw-shadow-[0_0_15px_5px_rgba(255,215,0,0.7)]"
              >
                <div>
                  <img
                    src={post.image}
                    alt={post.title}
                    loading="lazy"
                    className="tw-w-full tw-max-h-40 tw-object-contain tw-rounded-md tw-mb-4 tw-transition-all tw-duration-300"
                  />
                  <h2 className="tw-text-xl tw-font-semibold tw-text-yellow-400 tw-mb-4">{post.title}</h2>
                  <p className="tw-text-gray-300 tw-mb-4">{post.excerpt}</p>
                </div>
                <button
                  onClick={() => setSelectedPost(index)}
                  className="tw-bg-yellow-400 tw-text-black tw-px-4 tw-py-2 tw-rounded tw-font-medium hover:tw-bg-yellow-300 tw-transition tw-duration-150 tw-mt-auto"
                >
                  {t("read_more")}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="tw-bg-gray-900/80 tw-rounded-lg tw-p-6 tw-shadow-lg tw-border tw-border-yellow-400/50">
            <button
              onClick={() => setSelectedPost(null)}
              className="tw-mb-6 tw-bg-yellow-400 tw-text-black tw-p-2 tw-rounded-full tw-font-medium hover:tw-bg-yellow-300 tw-transition tw-duration-150 tw-w-10 tw-h-10 tw-flex tw-items-center tw-justify-center"
              aria-label="Back to Blog"
            >
              <ArrowLeftIcon className="tw-w-6 tw-h-6" />
            </button>
            <img
              src={blogPosts[selectedPost].image}
              alt={blogPosts[selectedPost].title}
              loading="lazy"
              className="tw-w-full tw-max-h-96 tw-object-contain tw-rounded-md tw-mb-6 tw-transition-all tw-duration-300"
            />
            <h2 className="tw-text-2xl tw-font-semibold tw-text-yellow-400 tw-mb-4">{blogPosts[selectedPost].title}</h2>
            <div className="tw-prose tw-prose-invert tw-max-w-none">
              {blogPosts[selectedPost].content}
            </div>
            {/* Bottom Back Button */}
            <div className="tw-flex tw-justify-center tw-mt-10">
              <button
                onClick={() => setSelectedPost(null)}
                className="tw-bg-yellow-400 tw-text-black tw-px-6 tw-py-3 tw-rounded-full tw-font-semibold hover:tw-bg-yellow-300 tw-transition tw-duration-150 tw-flex tw-items-center tw-gap-2"
              >
                <ArrowLeftIcon className="tw-w-5 tw-h-5" />
                Back to Blog
              </button>
            </div>

          </div>
        )}
      </div>
    </section>
  );
};

export default Blog;