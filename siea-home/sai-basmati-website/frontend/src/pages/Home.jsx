import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { Pagination, Navigation } from "swiper/modules";
import Products from "./Products";
import About from "./About";
import Feedback from "./Feedback";
import Contact from "../components/Contact";
import Service from "../components/Service";
import video1 from "../assets/siea1.mp4";
import video2 from "../assets/siea2.mp4";
import { useLanguage } from "../contexts/LanguageContext";
import IndianAgriRSSFeed from "../components/IndianAgriRSSFeed";

export default function Home() {
  const { t } = useLanguage();

  return (
    <>
      <IndianAgriRSSFeed />
      <section className="relative tw-text-yellow-600 tw-py-16" style={{ marginTop: "10px" }}>
        <div className="container">
          <div className="row align-items-center gy-4 tw-bg-black/50 tw-backdrop-blur-md tw-rounded-2xl tw-shadow-lg tw-p-8">
            <div className="col-lg-6">
              <h1 className="tw-text-4xl tw-font-bold tw-leading-tight">
                {t("hero_title")}
              </h1>
              <p className="tw-mt-3 tw-text-yellow-600/90">
                {t("hero_subtitle")}
              </p>
              <div className="tw-mt-5 tw-flex tw-gap-3">
                <Link to="/products" className="btn btn-light">
                  {t("view_prices")}
                </Link>
                <Link to="/feedback" className="btn btn-outline-light">
                  {t("feedback")}
                </Link>
              </div>
            </div>
            <div className="col-lg-6">
              <Swiper
                modules={[Pagination, Navigation]}
                pagination={{ clickable: true }}
                navigation={true}
                loop={true}
                className="tw-rounded-2xl tw-shadow-2xl tw-border tw-border-white/20"
              >
                <SwiperSlide>
                  <video
                    src={video1}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="tw-rounded-2xl tw-w-full tw-h-[320px] tw-object-cover tw-shadow-[0_0_20px_rgba(255,215,0,0.7)]"
                  />
                </SwiperSlide>
                <SwiperSlide>
                  <video
                    src={video2}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="tw-rounded-2xl tw-w-full tw-h-[320px] tw-object-cover tw-shadow-[0_0_20px_rgba(255,215,0,0.7)]"
                  />
                </SwiperSlide>
              </Swiper>
            </div>
          </div>
        </div>
      </section>
      <section className="tw-my-12">
        <div className="container tw-bg-black/50 tw-backdrop-blur-lg tw-rounded-2xl tw-shadow-md tw-p-8">
          <About />
        </div>
      </section>
      <section className="tw-my-12">
        <div className="container tw-bg-black/50 tw-backdrop-blur-lg tw-rounded-2xl tw-shadow-md tw-p-8">
          <Products />
        </div>
      </section>

      <section className="tw-my-12">
        <div className="container tw-bg-black/50 tw-backdrop-blur-lg tw-rounded-2xl tw-shadow-md tw-p-8">
          <Service />
        </div>
      </section>
      <section
        id="contact-feedback"
        className="tw-my-12 tw-px-3 sm:tw-px-6"
      >
        <div className="container tw-max-w-7xl tw-mx-auto tw-bg-black/50 tw-backdrop-blur-lg tw-rounded-2xl tw-shadow-md tw-p-4 sm:tw-p-6 lg:tw-p-8">
          <h2 className="tw-text-xl sm:tw-text-2xl lg:tw-text-3xl tw-font-bold tw-text-center tw-text-yellow-400 tw-mb-6 sm:tw-mb-8">
            {t("get_in_touch")}
          </h2>
          <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-8">
            <div>
              <div className="tw-bg-black/20 tw-p-6 tw-rounded-lg">
                <Contact />
              </div>
            </div>
            <div>
              <div className="tw-bg-black/20 tw-p-6 tw-rounded-lg">
                <Feedback />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}