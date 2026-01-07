import React from "react";
import { useLanguage } from "../contexts/LanguageContext";

const ProductDetailsPanel = ({
    product,
    allProducts,
    onBack,
    onEnquire,
    onViewDetails,
    getConversionRate,
    getCurrencySymbol
}) => {
    const { currentLang } = useLanguage();

    if (!product) return null;

    const name = product.name?.[currentLang] || product.name?.en;
    const desc = product.desc?.[currentLang] || product.desc?.en;
    const specs = product.specs || {};
    const hsn = product.hsn;

    const relatedProducts = allProducts
        ?.filter(
            p =>
                p.category === product.category &&
                (p.firebaseId || p.id) !== (product.firebaseId || product.id)
        )
        .slice(0, 3);

    const formatPrice = () => {
        if (!product.price) return "Price on request";
        const nums = product.price.match(/[\d,]+/g);
        if (!nums || nums.length < 2) return product.price;

        const min = parseInt(nums[0].replace(/,/g, ""));
        const max = parseInt(nums[1].replace(/,/g, ""));
        const rate = getConversionRate();
        const symbol = getCurrencySymbol();

        return `${symbol}${Math.round(min * rate).toLocaleString()} – ${symbol}${Math.round(max * rate).toLocaleString()} / qtl`;
    };

    return (
        <div className="tw-max-w-5xl tw-mx-auto tw-p-6 tw-bg-black/70 tw-backdrop-blur-xl tw-rounded-2xl tw-border tw-border-yellow-400/30">

            {/* Back */}
            <button
                onClick={onBack}
                className="tw-text-yellow-300 tw-mb-6 hover:tw-underline"
            >
                ← Back to Products
            </button>

            {/* MAIN SECTION */}
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-8 tw-items-start">

                {/* IMAGE CARD */}
                <div className="tw-bg-black/50 tw-p-4 tw-rounded-xl tw-border tw-border-yellow-400/20">
                    <img
                        src={product.image || "./img/placeholder-rice.jpg"}
                        alt={name}
                        className="tw-w-full tw-h-[260px] tw-object-cover tw-rounded-lg"
                    />

                    {/* Enquire Now Button BELOW IMAGE */}
                    <div className="tw-mt-5 tw-flex tw-justify-center">
                        <button
                            onClick={onEnquire}
                            className="tw-bg-yellow-400 tw-text-black tw-font-bold tw-px-8 tw-py-3 tw-rounded-xl tw-text-base hover:tw-scale-105 tw-transition"
                        >
                            Enquire Now
                        </button>
                    </div>
                </div>



                {/* DETAILS */}
                <div>
                    <h1 className="tw-text-2xl tw-font-extrabold tw-text-yellow-400">
                        {name}
                    </h1>

                    {/* Price Badge */}
                    <div className="tw-inline-block tw-bg-yellow-400/10 tw-text-yellow-300 tw-px-3 tw-py-1 tw-rounded-lg tw-text-sm tw-font-semibold tw-mt-2">
                        {formatPrice()}
                    </div>

                    <p className="tw-text-sm tw-text-yellow-200 tw-mt-4 tw-leading-relaxed">
                        {desc}
                    </p>

                    {/* SPECIFICATIONS */}
                    {Object.keys(specs).length > 0 && (
                        <div className="tw-mt-6">
                            <h3 className="tw-text-base tw-font-semibold tw-text-yellow-400 tw-mb-3">
                                Product Specifications
                            </h3>

                            <div className="tw-grid tw-grid-cols-2 tw-gap-y-2 tw-text-sm">
                                {Object.entries(specs).map(([key, value]) => (
                                    <React.Fragment key={key}>
                                        <div className="tw-text-yellow-300 capitalize">
                                            {key.replace(/([A-Z])/g, " $1")}
                                        </div>
                                        <div className="tw-text-yellow-100">
                                            {value}
                                        </div>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* HSN */}
                    {hsn && (
                        <div className="tw-mt-4 tw-text-sm tw-text-yellow-300">
                            <strong>HSN Code:</strong> {hsn}
                        </div>
                    )}
                </div>
            </div>

            {/* <div className="tw-mt-8 tw-flex tw-justify-center">
                <button
                    onClick={onEnquire}
                    className="tw-bg-yellow-400 tw-text-black tw-font-bold tw-px-10 tw-py-3 tw-rounded-xl tw-text-lg hover:tw-scale-105 tw-transition"
                >
                    Enquire Now
                </button>
            </div> */}

            {/* RELATED PRODUCTS */}
            {relatedProducts?.length > 0 && (
                <div className="tw-mt-12 tw-bg-black/50 tw-rounded-xl tw-p-5 tw-border tw-border-yellow-400/20">
                    <h3 className="tw-text-lg tw-font-semibold tw-text-yellow-400 tw-mb-5 tw-text-center">
                        Related Products
                    </h3>

                    <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-3 tw-gap-5">
                        {relatedProducts.map(rp => (
                            <div
                                key={rp.firebaseId || rp.id}
                                className="tw-bg-black/60 tw-rounded-xl tw-p-3 tw-border tw-border-yellow-400/20 hover:tw-border-yellow-400 hover:tw-scale-105 tw-transition cursor-pointer"
                                onClick={() => onViewDetails(rp)}
                            >
                                <img
                                    src={rp.image || "./img/placeholder-rice.jpg"}
                                    alt={rp.name?.en}
                                    className="tw-w-full tw-h-32 tw-object-cover tw-rounded-lg"
                                />

                                <h4 className="tw-text-sm tw-font-semibold tw-text-yellow-300 tw-mt-2">
                                    {rp.name?.en}
                                </h4>

                                <p className="tw-text-xs tw-text-yellow-200">
                                    {rp.desc?.en}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}



        </div>
    );
};

export default ProductDetailsPanel;
