// src/components/Service.jsx
import React, { useState, useMemo, useCallback, useEffect } from "react";
import MapImage from "../assets/Map.png";
import Branding from "../assets/Branding-Services.png";
import Profitable from "../assets/Profitable-Purchase.jpg";
import Personalization from "../assets/Personalization.jpg";
import Guidance from "../assets/Guidance.jpg";
import Quality from "../assets/Quality.jpg";
import { useLanguage } from "../contexts/LanguageContext";
import { otherServices } from "../data/services";
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { useLocation } from "react-router-dom";
import 'react-lazy-load-image-component/src/effects/blur.css';

/* Helper: safely get a string from possibly localized/value object */
const safeString = (v) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    if (v.en) return v.en;
    if (v.name && typeof v.name === "string") return v.name;
    if (v.title && typeof v.title === "string") return v.title;
    return JSON.stringify(v);
  }
  return String(v);
};

const Service = React.memo(() => {
  const { t } = useLanguage();
  const location = useLocation();

  // Get selected service from URL or state
  const [selectedService, setSelectedService] = useState("");

  // Parse URL for service query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const serviceFromUrl = searchParams.get('service');
    
    // Also check location state
    const serviceFromState = location.state?.selectedService;
    
    if (serviceFromUrl && otherServices[serviceFromUrl]) {
      setSelectedService(serviceFromUrl);
    } else if (serviceFromState && otherServices[serviceFromState]) {
      setSelectedService(serviceFromState);
    }
  }, [location]);

  // Services list
  const servicesList = useMemo(
    () => [
      { image: MapImage, titleKey: "trusted_pan_india_network" },
      { image: Branding, titleKey: "branding_packaging_services" },
      { image: Profitable, titleKey: "profitable_purchase" },
      { image: Personalization, titleKey: "personalization_available" },
      { image: Guidance, titleKey: "professional_guidance" },
      { image: Quality, titleKey: "quality_assured" },
    ],
    []
  );

  // Clear selected service when component unmounts
  useEffect(() => {
    return () => {
      // Reset service selection if needed
    };
  }, []);

  return (
    <>
      <section className="service-section">
        <div className="container">
          <h1 className="tw-text-3xl tw-font-bold tw-text-yellow-400 tw-mb-8 tw-text-center service-heading">
            {t("our_services")}
          </h1>

          {/* Services Grid */}
          <div className="service-grid">
            {servicesList.map((service, index) => (
              <div key={index} className="service-card">
                <LazyLoadImage
                  src={service.image}
                  alt={t(service.titleKey)}
                  className="service-image"
                  effect="blur"
                  threshold={100}
                  wrapperClassName="service-image-wrapper"
                />
                <p className="service-title" dangerouslySetInnerHTML={{ __html: t(service.titleKey).replace("&", "&amp;") }} />
              </div>
            ))}
          </div>

          {/* Other Services - Only show if a service is selected */}
          {selectedService && otherServices[selectedService] && (
            <div className="other-services-section tw-mt-16">
              <h2 className="tw-text-2xl tw-font-bold tw-text-yellow-400 tw-mb-6 tw-text-center">
                {selectedService}
              </h2>

              {/* Vendor List */}
              <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-8 tw-mt-12">
                {otherServices[selectedService].map((vendor) => {
                  const cleanNum = (vendor.contactNo || "").replace(/\D/g, "");
                  let phone = cleanNum.startsWith("91") && cleanNum.length > 10 ? cleanNum.slice(2) : cleanNum;
                  if (cleanNum.length > 10) phone = cleanNum.slice(-10);

                  const emailLink = vendor.email && vendor.email !== "N/A" ? `mailto:${vendor.email}` : null;
                  const callLink = phone.length >= 10 ? `tel:+91${phone}` : null;

                  const hasEmail = !!emailLink;
                  const hasPhone = !!callLink;

                  return (
                    <div
                      key={vendor.serialNo || vendor.partyName || Math.random()}
                      className="tw-relative tw-bg-gray-900 tw-border-2 tw-border-yellow-500 tw-rounded-2xl tw-overflow-hidden tw-shadow-lg tw-flex tw-flex-col tw-h-full"
                      style={{ borderTop: "10px solid #FFD700" }}
                    >
                      {/* <div className="tw-absolute -tw-top-5 -tw-left-5 tw-w-14 tw-h-14 tw-bg-yellow-500 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-black tw-font-bold tw-text-2xl tw-shadow-lg tw-z-10">
                        {vendor.serialNo}
                      </div> */}
                      <div className="tw-p-8 tw-pt-12 tw-flex-1 tw-flex tw-flex-col">
                        <h3 className="tw-text-2xl tw-font-extrabold tw-text-yellow-400 tw-mb-5 tw-tracking-tight">{safeString(vendor.partyName)}</h3>
                        <div className="tw-space-y-4 tw-flex-1">
                          <div>
                            <p className="tw-text-xs tw-text-gray-400 tw-uppercase tw-tracking-wider">Product:</p>
                            <p className="tw-text-white tw-font-semibold">{safeString(vendor.product)}</p>
                          </div>
                          <div>
                            <p className="tw-text-xs tw-text-gray-400 tw-uppercase tw-tracking-wider">Address:</p>
                            <p className="tw-text-white tw-font-medium">{safeString(vendor.address)}</p>
                          </div>
                          {vendor.contactPerson && (
                            <div>
                              <p className="tw-text-xs tw-text-gray-400 tw-uppercase tw-tracking-wider">Contact Person:</p>
                              <p className="tw-text-white tw-font-medium">{safeString(vendor.contactPerson)}</p>
                            </div>
                          )}
                        </div>
                        <div className={`tw-flex tw-gap-4 tw-mt-8 ${!hasEmail || !hasPhone ? "tw-justify-center" : "tw-justify-between"}`}>
                          {hasEmail && (
                            <a href={emailLink} className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-w-40 tw-bg-transparent tw-border-2 tw-border-yellow-500 tw-text-yellow-400 tw-font-bold tw-py-3 tw-px-4 tw-rounded-xl hover:tw-bg-yellow-500 hover:tw-text-black tw-transition-all tw-shadow">
                              Email
                            </a>
                          )}
                          {hasPhone && (
                            <a href={callLink} className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-w-40 tw-bg-transparent tw-border-2 tw-border-yellow-500 tw-text-yellow-400 tw-font-bold tw-py-3 tw-px-4 tw-rounded-xl hover:tw-bg-yellow-500 hover:tw-text-black tw-transition-all tw-shadow">
                              Call
                            </a>
                          )}
                          {!hasEmail && !hasPhone && (
                            <p className="tw-text-gray-500 tw-text-sm tw-italic">Contact details not available</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .service-section .service-card {
            transform: translateZ(0);
            backface-visibility: hidden;
          }
          
          .service-section * {
            -webkit-tap-highlight-color: transparent;
          }
          
          .service-section {
            will-change: transform;
          }
        }
        
        .service-image-wrapper {
          min-height: 100px;
        }
        
        @media (max-width: 480px) {
          .service-image-wrapper {
            min-height: 100px;
          }
        }
      `}</style>
    </>
  );
});

export default Service;