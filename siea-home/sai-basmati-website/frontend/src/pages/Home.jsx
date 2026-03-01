import React, { lazy, Suspense, useMemo } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { Pagination, Navigation } from "swiper/modules";

import { useLanguage } from "../contexts/LanguageContext";

// ✅ Lazy Load Heavy Components
const Products = lazy(() => import("./Products"));
const About = lazy(() => import("./About"));
const Feedback = lazy(() => import("./Feedback"));
const Contact = lazy(() => import("../components/Contact"));
const Service = lazy(() => import("../components/Service"));
const IndianAgriRSSFeed = lazy(() =>
  import("../components/IndianAgriRSSFeed")
);

import video1 from "../assets/siea1.mp4";
import video2 from "../assets/siea2.mp4";

export default function Home() {
  const { t } = useLanguage();

  // ✅ Memoize Swiper modules (avoid recreation every render)
  const swiperModules = useMemo(() => [Pagination, Navigation], []);

  return (
    <>
      {/* RSS Feed Lazy Loaded */}
      <Suspense fallback={null}>
        <IndianAgriRSSFeed />
      </Suspense>

      {/* HERO SECTION */}
      <section
        className="relative tw-text-yellow-600 tw-py-16"
        style={{ marginTop: "10px" }}
      >
        <div className="container">
          <div className="row align-items-center gy-4 tw-bg-black/50 tw-backdrop-blur-md tw-rounded-2xl tw-shadow-lg tw-p-8">

            {/* LEFT SIDE */}
            <div className="col-lg-6">
              <h1 className="tw-text-4xl tw-font-bold tw-leading-tight">
                {t("hero_title")}
              </h1>

              <p className="tw-mt-3 tw-text-yellow-600/90">
                {t("hero_subtitle")}
              </p>

              <div className="tw-mt-5 tw-flex tw-gap-3">
                <Link to="/market-rates" className="btn btn-gold">
                  {t("view_prices")}
                </Link>
                <Link to="/feedback" className="btn btn-outline-light">
                  {t("feedback")}
                </Link>
              </div>
            </div>

            {/* RIGHT SIDE - VIDEO SWIPER */}
            <div className="col-lg-6">

              <Swiper
                modules={swiperModules}
                pagination={{ clickable: true }}
                navigation
                slidesPerView={1}
                spaceBetween={10}
                loop={false}
                watchSlidesProgress
                className="tw-rounded-2xl tw-shadow-2xl tw-border tw-border-white/20 tw-overflow-hidden"
              >
                <SwiperSlide>
                  <div className="tw-h-[320px] tw-overflow-hidden">
                    <video
                      src={video1}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="none"   // 🔥 Better performance
                      loading="lazy"
                      className="tw-w-full tw-h-full tw-object-cover"
                    />
                  </div>
                </SwiperSlide>

                <SwiperSlide>
                  <div className="tw-h-[320px] tw-overflow-hidden">
                    <video
                      src={video2}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="none"
                      loading="lazy"
                      className="tw-w-full tw-h-full tw-object-cover"
                    />
                  </div>
                </SwiperSlide>

              </Swiper>

            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="tw-my-12">
        <div className="container tw-bg-black/50 tw-backdrop-blur-lg tw-rounded-2xl tw-shadow-md tw-p-8">
          <Suspense fallback={<div>Loading...</div>}>
            <About />
          </Suspense>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="tw-my-12">
        <div className="container tw-bg-black/50 tw-backdrop-blur-lg tw-rounded-2xl tw-shadow-md tw-p-8">
          <Suspense fallback={<div>Loading...</div>}>
            <Products />
          </Suspense>
        </div>
      </section>

      {/* SERVICE */}
      <section className="tw-my-12">
        <div className="container tw-bg-black/50 tw-backdrop-blur-lg tw-rounded-2xl tw-shadow-md tw-p-8">
          <Suspense fallback={<div>Loading...</div>}>
            <Service />
          </Suspense>
        </div>
      </section>

      {/* CONTACT + FEEDBACK */}
      <section
        id="contact-feedback"
        className="tw-my-12 tw-px-3 sm:tw-px-6"
      >
        <div className="container tw-max-w-7xl tw-mx-auto tw-bg-black/50 tw-backdrop-blur-lg tw-rounded-2xl tw-shadow-md tw-p-4 sm:tw-p-6 lg:tw-p-8">

          <h2 className="tw-text-xl sm:tw-text-2xl lg:tw-text-3xl tw-font-bold tw-text-center tw-text-yellow-400 tw-mb-6 sm:tw-mb-8">
            {t("get_in_touch")}
          </h2>

          <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-8">

            <Suspense fallback={<div>Loading...</div>}>
              <div className="tw-bg-black/20 tw-p-6 tw-rounded-lg">
                <Contact />
              </div>
            </Suspense>

            <Suspense fallback={<div>Loading...</div>}>
              <div className="tw-bg-black/20 tw-p-6 tw-rounded-lg">
                <Feedback />
              </div>
            </Suspense>

          </div>

        </div>
      </section>
    </>
  );
}