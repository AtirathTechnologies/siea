// src/components/JoinUs.jsx
import React, { useState } from 'react';
import { useLanguage } from "../contexts/LanguageContext";

const JoinUs = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('vendor');
  const [formData, setFormData] = useState({
    // Vendor Form
    vendorName: '',
    vendorEmail: '',
    vendorPhone: '',
    vendorCompany: '',
    vendorProduct: '',
    vendorAddress: '',
    vendorExperience: '',
    vendorCapacity: '',
    vendorCertifications: '',

    // Distributor Form
    distributorName: '',
    distributorEmail: '',
    distributorPhone: '',
    distributorCompany: '',
    distributorRegion: '',
    distributorBusinessType: '',
    distributorAnnualTurnover: '',
    distributorStorageCapacity: '',
    distributorExistingBrands: '',

    // Partner Form
    partnerName: '',
    partnerEmail: '',
    partnerPhone: '',
    partnerCompany: '',
    partnerInvestmentRange: '',
    partnerBusinessModel: '',
    partnerBackground: '',
    partnerExpectations: '',

    // Agent Form
    agentName: '',
    agentEmail: '',
    agentPhone: '',
    agentLocation: '',
    agentExperience: '',
    agentNetwork: '',
    agentLanguages: '',
    agentCommissionExpectation: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneChange = (e) => {
    const { name, value } = e.target;

    // Allow only digits
    const numericValue = value.replace(/\D/g, "");

    setFormData(prev => ({
      ...prev,
      [name]: numericValue
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Prepare data based on active tab
    let submissionData = {};
    let type = '';

    switch (activeTab) {
      case 'vendor':
        type = 'Vendor Registration';
        submissionData = {
          name: formData.vendorName,
          email: formData.vendorEmail,
          phone: formData.vendorPhone,
          company: formData.vendorCompany,
          product: formData.vendorProduct,
          address: formData.vendorAddress,
          experience: formData.vendorExperience,
          capacity: formData.vendorCapacity,
          certifications: formData.vendorCertifications
        };
        break;
      case 'distributor':
        type = 'Distributor Registration';
        submissionData = {
          name: formData.distributorName,
          email: formData.distributorEmail,
          phone: formData.distributorPhone,
          company: formData.distributorCompany,
          region: formData.distributorRegion,
          businessType: formData.distributorBusinessType,
          annualTurnover: formData.distributorAnnualTurnover,
          storageCapacity: formData.distributorStorageCapacity,
          existingBrands: formData.distributorExistingBrands
        };
        break;
      case 'partner':
        type = 'Business Partner Registration';
        submissionData = {
          name: formData.partnerName,
          email: formData.partnerEmail,
          phone: formData.partnerPhone,
          company: formData.partnerCompany,
          investmentRange: formData.partnerInvestmentRange,
          businessModel: formData.partnerBusinessModel,
          background: formData.partnerBackground,
          expectations: formData.partnerExpectations
        };
        break;
      case 'agent':
        type = 'Sales Agent Registration';
        submissionData = {
          name: formData.agentName,
          email: formData.agentEmail,
          phone: formData.agentPhone,
          location: formData.agentLocation,
          experience: formData.agentExperience,
          network: formData.agentNetwork,
          languages: formData.agentLanguages,
          commissionExpectation: formData.agentCommissionExpectation
        };
        break;
    }

    // Send to WhatsApp
    const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER;
    const formatKey = (key) =>
      key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase());

    const businessDetails = Object.entries(submissionData)
      .filter(([key]) => !['name', 'email', 'phone', 'company'].includes(key))
      .map(([key, value]) => `• ${formatKey(key)}: ${value}`)
      .join('\n');

    const message =
      `*${type}*

*Personal Details*
• Name: ${submissionData.name}
• Email: ${submissionData.email}
• Phone: ${submissionData.phone}
${submissionData.company ? `• Company: ${submissionData.company}` : ''}

*Business Details*
${businessDetails}

*Submitted On*
${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      // Reset form after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          vendorName: '', vendorEmail: '', vendorPhone: '', vendorCompany: '', vendorProduct: '', vendorAddress: '', vendorExperience: '', vendorCapacity: '', vendorCertifications: '',
          distributorName: '', distributorEmail: '', distributorPhone: '', distributorCompany: '', distributorRegion: '', distributorBusinessType: '', distributorAnnualTurnover: '', distributorStorageCapacity: '', distributorExistingBrands: '',
          partnerName: '', partnerEmail: '', partnerPhone: '', partnerCompany: '', partnerInvestmentRange: '', partnerBusinessModel: '', partnerBackground: '', partnerExpectations: '',
          agentName: '', agentEmail: '', agentPhone: '', agentLocation: '', agentExperience: '', agentNetwork: '', agentLanguages: '', agentCommissionExpectation: ''
        });
      }, 3000);
    }, 2000);
  };

  const tabs = [
    { id: 'vendor', label: 'Become a Vendor', icon: '🏭' },
    { id: 'distributor', label: 'Become a Distributor', icon: '🚚' },
    { id: 'partner', label: 'Business Partner', icon: '🤝' },
    { id: 'agent', label: 'Sales Agent', icon: '👨‍💼' }
  ];

  const renderForm = () => {
    switch (activeTab) {
      case 'vendor':
        return (
          <div className="tw-space-y-6">
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
              <div>
                <input
                  type="text"
                  name="vendorName"
                  placeholder="Full Name *"
                  value={formData.vendorName}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="email"
                  name="vendorEmail"
                  placeholder="Email Address *"
                  value={formData.vendorEmail}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="tel"
                  name="vendorPhone"
                  placeholder="Phone Number *"
                  value={formData.vendorPhone}
                  onChange={handlePhoneChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={15}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  name="vendorCompany"
                  placeholder="Company Name *"
                  value={formData.vendorCompany}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
            </div>

            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
              <div>
                <input
                  type="text"
                  name="vendorProduct"
                  placeholder="Main Products/Specialization *"
                  value={formData.vendorProduct}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  name="vendorCapacity"
                  placeholder="Production Capacity (Monthly) *"
                  value={formData.vendorCapacity}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
            </div>

            <div>
              <textarea
                name="vendorAddress"
                placeholder="Factory/Office Address *"
                value={formData.vendorAddress}
                onChange={handleInputChange}
                rows="3"
                className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                required
              />
            </div>

            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
              <div>
                <input
                  type="text"
                  name="vendorExperience"
                  placeholder="Years in Business *"
                  value={formData.vendorExperience}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  name="vendorCertifications"
                  placeholder="Certifications (FSSAI, ISO, etc.)"
                  value={formData.vendorCertifications}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                />
              </div>
            </div>
          </div>
        );

      case 'distributor':
        return (
          <div className="tw-space-y-6">
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
              <div>
                <input
                  type="text"
                  name="distributorName"
                  placeholder="Full Name *"
                  value={formData.distributorName}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="email"
                  name="distributorEmail"
                  placeholder="Email Address *"
                  value={formData.distributorEmail}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="tel"
                  name="distributorPhone"
                  placeholder="Phone Number *"
                  value={formData.distributorPhone}
                  onChange={handlePhoneChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={15}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  name="distributorCompany"
                  placeholder="Company Name *"
                  value={formData.distributorCompany}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
            </div>

            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
              <div>
                <select
                  name="distributorRegion"
                  value={formData.distributorRegion}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                >
                  <option value="">Select Region *</option>
                  <option value="north">North India</option>
                  <option value="south">South India</option>
                  <option value="east">East India</option>
                  <option value="west">West India</option>
                  <option value="central">Central India</option>
                  <option value="international">International</option>
                </select>
              </div>
              <div>
                <select
                  name="distributorBusinessType"
                  value={formData.distributorBusinessType}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                >
                  <option value="">Business Type *</option>
                  <option value="wholesaler">Wholesaler</option>
                  <option value="retailer">Retailer</option>
                  <option value="supermarket">Supermarket Chain</option>
                  <option value="institution">Institutional Supplier</option>
                  <option value="export">Export Business</option>
                </select>
              </div>
            </div>

            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
              <div>
                <input
                  type="text"
                  name="distributorAnnualTurnover"
                  placeholder="Annual Turnover (INR) *"
                  value={formData.distributorAnnualTurnover}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  name="distributorStorageCapacity"
                  placeholder="Storage Capacity (Sq. Ft.) *"
                  value={formData.distributorStorageCapacity}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
            </div>

            <div>
              <textarea
                name="distributorExistingBrands"
                placeholder="Currently Distributing Brands"
                value={formData.distributorExistingBrands}
                onChange={handleInputChange}
                rows="3"
                className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
              />
            </div>
          </div>
        );

      case 'partner':
        return (
          <div className="tw-space-y-6">
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
              <div>
                <input
                  type="text"
                  name="partnerName"
                  placeholder="Full Name *"
                  value={formData.partnerName}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="email"
                  name="partnerEmail"
                  placeholder="Email Address *"
                  value={formData.partnerEmail}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="tel"
                  name="partnerPhone"
                  placeholder="Phone Number *"
                  value={formData.partnerPhone}
                  onChange={handlePhoneChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={15}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  name="partnerCompany"
                  placeholder="Company/Organization"
                  value={formData.partnerCompany}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                />
              </div>
            </div>

            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
              <div>
                <select
                  name="partnerInvestmentRange"
                  value={formData.partnerInvestmentRange}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                >
                  <option value="">Investment Range *</option>
                  <option value="10-25">₹10-25 Lakhs</option>
                  <option value="25-50">₹25-50 Lakhs</option>
                  <option value="50-100">₹50 Lakhs - 1 Crore</option>
                  <option value="100+">Above 1 Crore</option>
                </select>
              </div>
              <div>
                <select
                  name="partnerBusinessModel"
                  value={formData.partnerBusinessModel}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                >
                  <option value="">Preferred Business Model *</option>
                  <option value="franchise">Franchise</option>
                  <option value="joint-venture">Joint Venture</option>
                  <option value="distribution">Distribution Partnership</option>
                  <option value="manufacturing">Manufacturing Partnership</option>
                  <option value="export">Export Partnership</option>
                </select>
              </div>
            </div>

            <div>
              <textarea
                name="partnerBackground"
                placeholder="Your Business Background/Experience *"
                value={formData.partnerBackground}
                onChange={handleInputChange}
                rows="3"
                className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                required
              />
            </div>

            <div>
              <textarea
                name="partnerExpectations"
                placeholder="Your Expectations from Partnership *"
                value={formData.partnerExpectations}
                onChange={handleInputChange}
                rows="3"
                className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                required
              />
            </div>
          </div>
        );

      case 'agent':
        return (
          <div className="tw-space-y-6">
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
              <div>
                <input
                  type="text"
                  name="agentName"
                  placeholder="Full Name *"
                  value={formData.agentName}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="email"
                  name="agentEmail"
                  placeholder="Email Address *"
                  value={formData.agentEmail}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="tel"
                  name="agentPhone"
                  placeholder="Phone Number *"
                  value={formData.agentPhone}
                  onChange={handlePhoneChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={15}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  name="agentLocation"
                  placeholder="City/Region *"
                  value={formData.agentLocation}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
            </div>

            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
              <div>
                <input
                  type="text"
                  name="agentExperience"
                  placeholder="Years of Sales Experience *"
                  value={formData.agentExperience}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  name="agentNetwork"
                  placeholder="Retail Network Coverage *"
                  value={formData.agentNetwork}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
            </div>

            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
              <div>
                <input
                  type="text"
                  name="agentLanguages"
                  placeholder="Languages Known *"
                  value={formData.agentLanguages}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  name="agentCommissionExpectation"
                  placeholder="Expected Commission Structure"
                  value={formData.agentCommissionExpectation}
                  onChange={handleInputChange}
                  className="tw-w-full tw-px-4 tw-py-3 tw-rounded-xl tw-bg-black/60 tw-text-yellow-100 placeholder:tw-text-yellow-500 tw-border-2 tw-border-yellow-600 focus:tw-ring-4 focus:tw-ring-yellow-400"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section className="join-us-section tw-py-12 sm:tw-py-16 tw-px-3 sm:tw-px-4 tw-bg-gradient-to-br tw-from-gray-900 tw-to-black tw-min-h-screen">
      <div className="container tw-max-w-6xl tw-mx-auto tw-w-full">
        {/* Header */}
        <div className="tw-text-center tw-mb-12">
          <h1 className="tw-text-2xl sm:tw-text-3xl lg:tw-text-4xl tw-font-bold tw-text-yellow-400 tw-mb-4">
            Join Our Network
          </h1>
          <p className="tw-text-base sm:tw-text-lg lg:tw-text-xl tw-text-yellow-200 tw-max-w-3xl tw-mx-auto">
            Partner with India's leading rice distribution network. Grow your business with our premium quality products and extensive market reach.
          </p>
        </div>

        {/* Success Message */}
        {submitted && (
          <div className="tw-fixed tw-top-4 tw-left-1/2 tw-transform -tw-translate-x-1/2 tw-z-50 tw-bg-green-600 tw-text-white tw-px-6 tw-py-4 tw-rounded-2xl tw-shadow-2xl tw-border-2 tw-border-green-400 tw-animate-bounce">
            <div className="tw-flex tw-items-center tw-gap-3">
              <svg className="tw-w-6 tw-h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="tw-font-bold">Application Submitted Successfully!</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="tw-bg-black/40 tw-backdrop-blur-xl tw-rounded-3xl tw-shadow-2xl tw-border-4 tw-border-yellow-400 tw-overflow-hidden">
          {/* Tabs */}
          <div className="tw-bg-yellow-900/50 tw-backdrop-blur-lg tw-border-b-2 tw-border-yellow-600">
            <div className="tw-grid tw-grid-cols-2 sm:tw-grid-cols-2 lg:tw-grid-cols-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tw-p-3 sm:tw-p-4 lg:tw-p-6 tw-text-sm sm:tw-text-base lg:tw-text-lg tw-font-bold tw-transition-all tw-duration-300 tw-flex tw-flex-col sm:tw-flex-row 
                  tw-items-center tw-justify-center tw-gap-1 sm:tw-gap-3 sm:tw-gap-3 ${activeTab === tab.id
                      ? 'tw-bg-yellow-500 tw-text-black tw-shadow-inner'
                      : 'tw-text-yellow-300 hover:tw-bg-yellow-900/70 hover:tw-text-yellow-100'
                    }`}>
                  <span className="tw-text-2xl">{tab.icon}</span>
                  <span className="tw-text-xs sm:tw-text-base tw-block tw-text-center">
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="tw-p-4 sm:tw-p-6 lg:tw-p-8">
            <form onSubmit={handleSubmit} className="tw-space-y-8">
              {renderForm()}

              {/* Submit Button */}
              <div className="tw-text-center tw-pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="tw-px-6 sm:tw-px-10 lg:tw-px-12 
  tw-py-3 sm:tw-py-4 
  tw-bg-gradient-to-r tw-from-yellow-500 tw-to-yellow-600 
  hover:tw-from-yellow-400 hover:tw-to-yellow-500 
  tw-text-black tw-font-bold 
  tw-text-base sm:tw-text-lg lg:tw-text-xl 
  tw-rounded-2xl tw-shadow-2xl 
  tw-transition-all tw-duration-300 
  transform hover:tw-scale-105 
  disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                >
                  {loading ? (
                    <div className="tw-flex tw-items-center tw-gap-3">
                      <div className="tw-w-6 tw-h-6 tw-border-2 tw-border-black tw-border-t-transparent tw-rounded-full tw-animate-spin"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    `Submit ${tabs.find(t => t.id === activeTab)?.label} Application`
                  )}
                </button>

                <p className="tw-text-yellow-300 tw-mt-4 tw-text-sm">
                  Your application will be sent via WhatsApp and our team will contact you within 24 hours.
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-6 lg:tw-gap-8 tw-mt-12 lg:tw-mt-16">
          <div className="tw-bg-yellow-900/30 tw-backdrop-blur tw-rounded-2xl tw-p-6 tw-border-2 tw-border-yellow-600 tw-text-center">
            <div className="tw-text-4xl tw-mb-4">🚀</div>
            <h3 className="tw-text-xl tw-font-bold tw-text-yellow-400 tw-mb-2">Business Growth</h3>
            <p className="tw-text-yellow-200">Access to premium products and extensive market network</p>
          </div>

          <div className="tw-bg-yellow-900/30 tw-backdrop-blur tw-rounded-2xl tw-p-6 tw-border-2 tw-border-yellow-600 tw-text-center">
            <div className="tw-text-4xl tw-mb-4">🛡️</div>
            <h3 className="tw-text-xl tw-font-bold tw-text-yellow-400 tw-mb-2">Full Support</h3>
            <p className="tw-text-yellow-200">Marketing, training, and operational support provided</p>
          </div>

          <div className="tw-bg-yellow-900/30 tw-backdrop-blur tw-rounded-2xl tw-p-6 tw-border-2 tw-border-yellow-600 tw-text-center">
            <div className="tw-text-4xl tw-mb-4">💰</div>
            <h3 className="tw-text-xl tw-font-bold tw-text-yellow-400 tw-mb-2">Lucrative Returns</h3>
            <p className="tw-text-yellow-200">Competitive commissions and profit margins</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JoinUs;