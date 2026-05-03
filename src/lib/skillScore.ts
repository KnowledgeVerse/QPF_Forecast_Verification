export interface ContingencyData {
  a: number; // Hits
  b: number; // False Alarms
  c: number; // Misses
  d: number; // Correct Negatives
}

// Utility to handle division by zero
const safeDivide = (numerator: number, denominator: number): number => {
  if (denominator === 0) {
    return 0;
  }
  return numerator / denominator;
};

// Probability of Detection (POD) or Hit Rate
export const calculatePOD = ({ a, c }: ContingencyData): number => {
  return safeDivide(a, a + c);
};

// False Alarm Ratio (FAR)
export const calculateFAR = ({ a, b }: ContingencyData): number => {
  return safeDivide(b, a + b);
};

// Miss Ratio (MR)
export const calculateMR = ({ a, c }: ContingencyData): number => {
  return safeDivide(c, a + c);
};

// Critical Success Index (CSI) or Threat Score (TS)
export const calculateCSI = ({ a, b, c }: ContingencyData): number => {
  return safeDivide(a, a + b + c);
};

// BIAS
export const calculateBIAS = ({ a, b, c }: ContingencyData): number => {
  return safeDivide(a + b, a + c);
};

// Proportion Correct (PC) or Accuracy
export const calculatePC = ({ a, b, c, d }: ContingencyData): number => {
  return safeDivide(a + d, a + b + c + d);
};

// True Skill Statistic (TSS) or Hanssen and Kuipers discriminant
export const calculateTSS = ({ a, b, c, d }: ContingencyData): number => {
  const denominator = (a + c) * (b + d);
  return safeDivide(a * d - b * c, denominator);
};

// Heidke Skill Score (HSS)
export const calculateHSS = ({ a, b, c, d }: ContingencyData): number => {
  const numerator = 2 * (a * d - b * c);
  const denominator = (a + c) * (c + d) + (a + b) * (b + d);
  return safeDivide(numerator, denominator);
};
