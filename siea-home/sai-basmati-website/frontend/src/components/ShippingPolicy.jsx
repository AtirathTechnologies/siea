import React from "react";

export default function ShippingPolicy() {

    return (
        <div className="tw-min-h-screen tw-bg-black tw-text-gray-200 tw-py-12 tw-px-4 sm:tw-px-6 lg:tw-px-8">
            <div className="tw-max-w-4xl tw-mx-auto">
                {/* Header */}
                <h1 className="tw-text-4xl md:tw-text-5xl tw-font-bold tw-text-yellow-400 tw-mb-4 tw-border-b tw-border-yellow-500/30 tw-pb-4">
                    Shipping Policy
                </h1>
                <p className="tw-text-yellow-300 tw-mb-8 tw-text-lg">
                    Sai Import Export Agro — Effective Date: March 2026
                </p>

                {/* Content sections */}
                <div className="tw-space-y-8">
                    {/* Introduction */}
                    <section className="tw-bg-gray-900/50 tw-p-6 tw-rounded-lg tw-border-l-4 tw-border-yellow-500">
                        <p className="tw-leading-relaxed">
                            Sai Import Export Agro specializes in global export of rice and agricultural products.
                        </p>
                    </section>

                    {/* Order Processing */}
                    <section>
                        <h2 className="tw-text-2xl tw-font-semibold tw-text-yellow-400 tw-mb-3">Order Processing</h2>
                        <div className="tw-bg-gray-900/30 tw-p-5 tw-rounded-lg">
                            <p>Orders are processed only after confirmation of payment terms or official purchase agreement.</p>
                        </div>
                    </section>

                    {/* Shipping Method */}
                    <section>
                        <h2 className="tw-text-2xl tw-font-semibold tw-text-yellow-400 tw-mb-3">Shipping Method</h2>
                        <div className="tw-bg-gray-900/30 tw-p-5 tw-rounded-lg">
                            <p>We export rice through reliable international shipping partners via:</p>
                            <ul className="tw-list-disc tw-list-outside tw-ml-5 tw-space-y-1 tw-mt-2 tw-text-gray-300">
                                <li>Sea Freight</li>
                                <li>Container Shipping (FCL / LCL)</li>
                            </ul>
                        </div>
                    </section>

                    {/* Delivery Timeline */}
                    <section>
                        <h2 className="tw-text-2xl tw-font-semibold tw-text-yellow-400 tw-mb-3">Delivery Timeline</h2>
                        <div className="tw-bg-gray-900/30 tw-p-5 tw-rounded-lg">
                            <p>Shipping timelines may vary depending on:</p>
                            <ul className="tw-list-disc tw-list-outside tw-ml-5 tw-space-y-1 tw-mt-2 tw-text-gray-300">
                                <li>Destination country</li>
                                <li>Port congestion</li>
                                <li>Customs clearance</li>
                                <li>International logistics conditions</li>
                            </ul>
                        </div>
                    </section>

                    {/* Shipping Charges */}
                    <section>
                        <h2 className="tw-text-2xl tw-font-semibold tw-text-yellow-400 tw-mb-3">Shipping Charges</h2>
                        <div className="tw-bg-gray-900/30 tw-p-5 tw-rounded-lg">
                            <p>Shipping charges depend on:</p>
                            <ul className="tw-list-disc tw-list-outside tw-ml-5 tw-space-y-1 tw-mt-2 tw-text-gray-300">
                                <li>Order quantity</li>
                                <li>Destination port</li>
                                <li>Container type</li>
                                <li>Freight market conditions</li>
                            </ul>
                        </div>
                    </section>

                    {/* Customs and Import Duties */}
                    <section>
                        <h2 className="tw-text-2xl tw-font-semibold tw-text-yellow-400 tw-mb-3">Customs and Import Duties</h2>
                        <div className="tw-bg-gray-900/30 tw-p-5 tw-rounded-lg">
                            <p>All import duties, taxes, and customs charges in the destination country are the responsibility of the buyer.</p>
                        </div>
                    </section>

                    {/* Shipping Documentation */}
                    <section>
                        <h2 className="tw-text-2xl tw-font-semibold tw-text-yellow-400 tw-mb-3">Shipping Documentation</h2>
                        <div className="tw-bg-gray-900/30 tw-p-5 tw-rounded-lg">
                            <p>We provide export documentation including:</p>
                            <ul className="tw-list-disc tw-list-outside tw-ml-5 tw-space-y-1 tw-mt-2 tw-text-gray-300">
                                <li>Commercial Invoice</li>
                                <li>Packing List</li>
                                <li>Bill of Lading</li>
                                <li>Certificate of Origin</li>
                            </ul>
                        </div>
                    </section>

                    {/* Shipping Delays */}
                    <section>
                        <h2 className="tw-text-2xl tw-font-semibold tw-text-yellow-400 tw-mb-3">Shipping Delays</h2>
                        <div className="tw-bg-gray-900/30 tw-p-5 tw-rounded-lg">
                            <p>Sai Import Export Agro will not be responsible for delays caused by shipping lines, customs authorities, natural disasters, or port restrictions.</p>
                        </div>
                    </section>

                    {/* Contact */}
                    <section>
                        <h2 className="tw-text-2xl tw-font-semibold tw-text-yellow-400 tw-mb-3">Contact</h2>
                        <div className="tw-bg-gray-900/30 tw-p-5 tw-rounded-lg tw-border-l-4 tw-border-yellow-500">
                            <p className="tw-font-medium">Sai Import Export Agro</p>
                            <p>Email: info@saiimportexportagro.com</p>
                            <p>Phone: +91 8595873862</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}