// Simulate new distribution with adjusted parameters
const currentScores = [39, 44, 47, 50, 53, 57, 60, 65, 70, 75, 81]; // sample range

// Current: baseBoost 3.5, divisor 17
// Proposed: baseBoost 2.5, divisor 19

console.log('DISTRIBUTION SIMULATION');
console.log('========================');
console.log('');
console.log('Current params: baseBoost=3.5, divisor=17');
console.log('Proposed params: baseBoost=2.5, divisor=19');
console.log('');

// Rough approximation of how scores would shift
// New score = (oldRaw - 1) / 19 * 17 / 17 * 10 * 10
// Simplified: newScore ≈ oldScore * (17/19) - adjustment

const adjustment = ((3.5 - 2.5) / 19) * 100;
const scaleFactor = 17 / 19;

console.log('Estimated shift: -' + adjustment.toFixed(1) + ' points from baseBoost');
console.log('Scale factor: ' + scaleFactor.toFixed(3));
console.log('');
console.log('Sample score transformations:');
console.log('Old Score → New Score (estimated)');
currentScores.forEach(old => {
  const newScore = Math.round(old * scaleFactor - adjustment * 0.5);
  console.log('  ' + old + ' → ' + newScore);
});
