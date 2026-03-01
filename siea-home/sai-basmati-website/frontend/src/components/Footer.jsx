import { useState } from "react";
import logoUrl from '../assets/logo.svg';
import { useLanguage } from "../contexts/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer id="footer" className="tw-border-t tw-border-yellow-600 tw-bg-black tw-py-4 sm:tw-py-6">
      <div className="tw-w-full tw-px-4 sm:tw-px-6 tw-max-w-7xl tw-mx-auto">
        <div className="tw-flex tw-flex-col tw-items-center md:tw-flex-row md:tw-items-center md:tw-justify-between tw-gap-3 sm:tw-gap-4">
          <div className="tw-flex tw-flex-row tw-items-center tw-gap-3 sm:tw-gap-4">
            <img
              src={logoUrl}
              alt={t("company_alt_text")}
              className="tw-w-9 tw-h-9 sm:tw-w-10 sm:tw-h-10 md:tw-w-[36px] md:tw-h-[36px]"
            />
            <span className="tw-font-semibold tw-text-yellow-400 tw-text-base sm:tw-text-lg md:tw-text-lg">
              {t("company_abbreviation")}
            </span>
          </div>

          <div className="tw-text-xs sm:tw-text-sm tw-text-yellow-400">
            © {new Date().getFullYear()} {t("company_full_name")}
          </div>


          <div className="tw-flex tw-items-center tw-gap-3 sm:tw-gap-4 tw-flex-wrap tw-justify-center">
            <a
              href="https://wa.me/918595827184"
              target="_blank"
              rel="noopener noreferrer"
              className="tw-text-yellow-400 hover:tw-text-green-600 tw-transition-all tw-duration-300 hover:tw-scale-105 md:tw-scale-100 md:hover:tw-scale-105"
              aria-label="WhatsApp"
            >
              <svg className="tw-w-6 tw-h-6 sm:tw-w-7 sm:tw-h-7 md:tw-w-4 md:tw-h-4 lg:tw-w-5 lg:tw-h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.99-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.864 3.49" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/sai_import_export_agro/"
              target="_blank"
              rel="noopener noreferrer"
              className="tw-text-yellow-400 hover:tw-text-pink-600 tw-transition-all tw-duration-300 hover:tw-scale-105 md:tw-scale-100 md:hover:tw-scale-105"
              aria-label="Instagram"
            >
              <svg className="tw-w-6 tw-h-6 sm:tw-w-7 sm:tw-h-7 md:tw-w-4 md:tw-h-4 lg:tw-w-5 lg:tw-h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/ram-sahare-954730281"
              target="_blank"
              rel="noopener noreferrer"
              className="tw-text-yellow-400 hover:tw-text-blue-600 tw-transition-all tw-duration-300 hover:tw-scale-105 md:tw-scale-100 md:hover:tw-scale-105"
              aria-label="LinkedIn"
            >
              <svg className="tw-w-6 tw-h-6 sm:tw-w-7 sm:tw-h-7 md:tw-w-4 md:tw-h-4 lg:tw-w-5 lg:tw-h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.375c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 11.375h-3v-5.5c0-1.312-.026-3-.011-3.5h-.004c-.016-.25-.051-1.088-.051-1.088h-2.973v5.588h-2.988v-10h2.873v1.375h.041c.396-.75 1.375-1.562 2.836-1.562 3.018 0 3.354 1.938 3.354 4.562v5.625z" />
              </svg>
            </a>
            <a
              href="https://t.me/SAIEXPORTANDIMPORt"
              target="_blank"
              rel="noopener noreferrer"
              className="tw-text-yellow-400 hover:tw-text-sky-500 tw-transition-all tw-duration-300 hover:tw-scale-105 md:tw-scale-100 md:hover:tw-scale-105"
              aria-label="Telegram"
            >
              <svg className="tw-w-6 tw-h-6 sm:tw-w-7 sm:tw-h-7 md:tw-w-4 md:tw-h-4 lg:tw-w-5 lg:tw-h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.95 8.77l-1.607 7.575c-.12.54-.44.67-.9.42l-2.45-1.8-1.18.95c-.13.13-.24.24-.49.24l.17-2.46 4.42-4c.19-.17-.04-.27-.29-.11l-5.46 3.43-2.1-.65c-.46-.14-.47-.52.1-.74l8.71-3.35c.38-.14.72.09.63.57z" />
              </svg>
            </a>
            <a
              href="https://www.youtube.com/@SaiRiceWorld"
              target="_blank"
              rel="noopener noreferrer"
              className="tw-text-yellow-400 hover:tw-text-red-600 tw-transition-all tw-duration-300 hover:tw-scale-105 md:tw-scale-100 md:hover:tw-scale-105"
              aria-label="YouTube"
            >
              <svg className="tw-w-6 tw-h-6 sm:tw-w-7 sm:tw-h-7 md:tw-w-4 md:tw-h-4 lg:tw-w-5 lg:tw-h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.016 3.016 0 0 0 .502 6.186 31.88 31.88 0 0 0 0 12.005c0 1.97.502 3.94.502 5.908a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.016 3.016 0 0 0 2.122-2.136C24 16.945 24 12.005 24 12.005s0-3.94-.502-5.819zM9.75 15.569V8.431l6.264 3.569-6.264 3.569z" />
              </svg>
            </a>

            <a
              href="https://www.facebook.com/saiimportexport8859"
              target="_blank"
              rel="noopener noreferrer"
              className="tw-text-yellow-400 hover:tw-text-blue-700 tw-transition-all tw-duration-300 hover:tw-scale-105 md:tw-scale-100 md:hover:tw-scale-105"
              aria-label="Facebook"
            >
              <svg className="tw-w-6 tw-h-6 sm:tw-w-7 sm:tw-h-7 md:tw-w-4 md:tw-h-4 lg:tw-w-5 lg:tw-h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}