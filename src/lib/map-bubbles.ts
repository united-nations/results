/** Match Open UN's proportional circle areas, undoing the map's 0.25px floor. */
export function bubbleRadiusInput(
  amount: number,
  referenceAmount: number,
  referenceRadius: number,
): number {
  const radius = referenceRadius * Math.sqrt(amount / referenceAmount);
  const position = (radius - 0.25) / (referenceRadius - 0.25);
  return Math.sign(position) * position ** 2;
}
