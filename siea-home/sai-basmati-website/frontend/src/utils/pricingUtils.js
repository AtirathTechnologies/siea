// pricingUtils.js

export const calculateFreightUSD = (region, country, port) => {
  const regionLower = (region || "").toLowerCase();
  const countryLower = (country || "").toLowerCase();
  const portLower = (port || "").toLowerCase();

  // Asia
  if (regionLower.includes("asia")) return 20;

  // Africa
  if (regionLower.includes("africa")) return 40;

  // Europe
  if (regionLower.includes("europe")) return 60;

  // North America / USA
  if (
    regionLower.includes("north america") ||
    countryLower.includes("usa")
  ) return 80;

  // Middle East
  if (
    regionLower.includes("middle east") ||
    regionLower.includes("gulf")
  ) {
    if (portLower.includes("jebel ali")) return 15;
    if (countryLower.includes("saudi")) return 50;
    return 40;
  }

  return 0;
};

export const calculateCIFUSD = (
  exMillMin,
  exMillMax,
  exchangeRateINR,
  region,
  country,
  port
) => {
   console.log("CIF FUNCTION CALLED");
  console.log("exMillMin:", exMillMin);
  console.log("exMillMax:", exMillMax);
  const fobMinINR = exMillMin + 4000;
  const fobMaxINR = exMillMax + 4000;

  const fobMinUSD = fobMinINR / exchangeRateINR;
  const fobMaxUSD = fobMaxINR / exchangeRateINR;

  const freight = calculateFreightUSD(region, country, port);

  return {
    fobMinUSD,
    fobMaxUSD,
    cifMinUSD: fobMinUSD + freight,
    cifMaxUSD: fobMaxUSD + freight,
    freightUSD: freight,
  };
};
