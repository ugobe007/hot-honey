import { useNavigate } from 'react-router-dom';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-green-400 to-purple-950 p-8 relative">
      {/* Radial green accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-96 h-96 bg-green-400 rounded-full blur-3xl opacity-40" style={{left: '20%', top: '40%'}}></div>
      </div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transition-all"
          >
            ← Home
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-8xl mb-4">🍯</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 bg-clip-text text-transparent mb-4">
            About Hot Honey
          </h1>
          <p className="text-2xl text-yellow-300 font-semibold mb-2">
            "Get Them While They're Hot."
          </p>
          <p className="text-xl text-purple-200 font-medium">
            A Social Discovery Platform for Investors and Startups
          </p>
        </div>

        {/* Content Container */}
        <div className="bg-white rounded-3xl shadow-2xl p-12">
          {/* Our Approach */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-orange-600 mb-4">Our Approach</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              Hot Honey is a <strong>social discovery platform</strong> that transforms how early-stage investors and startups connect. We've created a <strong>courtship process</strong> for investment—where chemistry develops before capital flows.
            </p>
            
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 mb-4">
              <h3 className="text-xl font-bold text-orange-600 mb-3">The 5-Point Discovery Framework</h3>
              <p className="text-gray-700 mb-4 leading-relaxed">
                At the heart of our approach is the <strong>5-Point StartupCard</strong>—a precisely designed format that condenses each startup's story into bite-sized, essential information. This creates <strong>quick interest</strong> and allows both investors and startups to develop genuine connections through progressive discovery.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">1️⃣</span>
                  <div>
                    <strong className="text-gray-800">The Problem:</strong>
                    <span className="text-gray-700"> Investors instantly understand the pain point being solved</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">2️⃣</span>
                  <div>
                    <strong className="text-gray-800">The Solution:</strong>
                    <span className="text-gray-700"> The startup's unique approach becomes immediately clear</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">3️⃣</span>
                  <div>
                    <strong className="text-gray-800">Market Size:</strong>
                    <span className="text-gray-700"> The opportunity scale sparks investor curiosity</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">4️⃣</span>
                  <div>
                    <strong className="text-gray-800">Team Companies:</strong>
                    <span className="text-gray-700"> Credibility is established through founder pedigree</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <strong className="text-gray-800">Investment Amount:</strong>
                    <span className="text-gray-700"> Investors know exactly what's being raised</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-purple-700 mb-3">🤝 The Courtship Process</h3>
              <p className="text-gray-700 leading-relaxed mb-3">
                Like dating, investing is about building trust and chemistry. Our platform mimics the natural courtship process:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex gap-2">
                  <span className="font-bold">💭</span>
                  <span><strong>First Impression:</strong> The 5-point card creates instant curiosity</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">🍯</span>
                  <span><strong>Progressive Reveal:</strong> Information unlocks as interest grows (honeypot secrets)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">🔒</span>
                  <span><strong>Protected Privacy:</strong> Investors stay anonymous until Stage 3</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">🔥</span>
                  <span><strong>Social Proof:</strong> Votes and heat meters show collective validation</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">💬</span>
                  <span><strong>Commitment:</strong> Only interested parties proceed to serious conversations</span>
                </li>
              </ul>
            </div>
          </section>

          {/* The Problem */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-orange-600 mb-4">The Problem We Solve</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              Millions of startups compete for over 1.2 million active investors, yet less than 3% ever connect meaningfully.
            </p>
            <div className="bg-orange-50 rounded-2xl p-6 mb-4">
              <ul className="space-y-3 text-gray-700">
                <li className="flex gap-3">
                  <span className="text-orange-600 font-bold">•</span>
                  <span><strong>Data-driven platforms</strong> like AngelList or Carta provide credibility but lack engagement.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-orange-600 font-bold">•</span>
                  <span><strong>Social platforms</strong> like LinkedIn and X provide energy but lack structure and verification.</span>
                </li>
              </ul>
            </div>
            <p className="text-lg text-gray-700 leading-relaxed font-semibold">
              Hot Honey fills the gap by combining both worlds—trust and excitement.
            </p>
          </section>

          {/* The Solution */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-orange-600 mb-4">The Solution</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              The platform guides users through a five-step emotional and functional journey:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-400 to-orange-500 text-white">
                    <th className="p-3 text-left rounded-tl-xl">Step</th>
                    <th className="p-3 text-left">Stage</th>
                    <th className="p-3 text-left rounded-tr-xl">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-orange-50">
                    <td className="p-3 font-bold">1</td>
                    <td className="p-3 font-semibold">Discovery</td>
                    <td className="p-3">Swipe-based exploration with concise, five-point StartupCards</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-3 font-bold">2</td>
                    <td className="p-3 font-semibold">Attraction</td>
                    <td className="p-3">Startups with 5+ "Yes" votes unlock added visibility and data</td>
                  </tr>
                  <tr className="bg-orange-50">
                    <td className="p-3 font-bold">3</td>
                    <td className="p-3 font-semibold">Reveal</td>
                    <td className="p-3">Investors disclose identity for private, time-bound pitch meetings</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-3 font-bold">4</td>
                    <td className="p-3 font-semibold">Commitment</td>
                    <td className="p-3">Deal Room access with NDA, decks, and analytics</td>
                  </tr>
                  <tr className="bg-orange-50">
                    <td className="p-3 font-bold">5</td>
                    <td className="p-3 font-semibold">Social Sharing</td>
                    <td className="p-3">Once a startup is "Hot," investors share it socially—fueling virality</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-lg text-gray-700 leading-relaxed mt-4 italic">
              This process transforms curiosity into confidence and commitment—the logic of human trust, encoded into a platform.
            </p>
          </section>

          {/* The 5-Point Format */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-orange-600 mb-4">The 5-Point Format</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              At the heart of Hot Honey is our <strong>5-point StartupCard format</strong>—a precisely designed data structure that condenses each startup's elevator pitch into a bite-size card that reveals just enough of what is important.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              <strong>Hot Honey helps identify quality investment candidates faster and with more precision.</strong> The Hot Money Process enables quick discovery without all the overhead and utilizes crowd and market intelligence to identify the winners.
            </p>
            
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold text-orange-600 mb-4">The Five Essential Points</h3>
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="text-2xl">1️⃣</span>
                  <div>
                    <strong className="text-gray-800">The Problem:</strong>
                    <span className="text-gray-700"> What pain point is being solved?</span>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-2xl">2️⃣</span>
                  <div>
                    <strong className="text-gray-800">The Solution:</strong>
                    <span className="text-gray-700"> How does the startup solve it?</span>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-2xl">3️⃣</span>
                  <div>
                    <strong className="text-gray-800">Market Size:</strong>
                    <span className="text-gray-700"> What's the opportunity scale?</span>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-2xl">4️⃣</span>
                  <div>
                    <strong className="text-gray-800">Team Companies:</strong>
                    <span className="text-gray-700"> Where have the founders worked before?</span>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-2xl">💰</span>
                  <div>
                    <strong className="text-gray-800">Investment Amount:</strong>
                    <span className="text-gray-700"> How much are they raising?</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-orange-300 rounded-2xl p-6 mb-4">
              <h3 className="text-xl font-bold text-orange-600 mb-3 flex items-center gap-2">
                🍯 Progressive Information Reveal
              </h3>
              <p className="text-gray-700 mb-3">
                Critical traction data and sensitive business metrics are hidden behind the <strong>honeypot icon</strong>. This information unlocks progressively as startups advance through stages, ensuring the right information is revealed at the right time.
              </p>
              <p className="text-gray-700">
                This structured reveal process allows investors to make quick, informed decisions at each stage without information overload—reviewing what is most important before proceeding.
              </p>
            </div>

            <div className="bg-purple-100 border-2 border-purple-400 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-purple-700 mb-3 flex items-center gap-2">
                🔒 Investor Anonymity Until Stage 3
              </h3>
              <p className="text-gray-700 mb-3">
                <strong>Investors remain completely anonymous during the Discovery and Attraction stages.</strong> Your identity is not disclosed to startups until you reach <strong>Stage 3 (Reveal)</strong>—when you actively choose to disclose your identity for private, time-bound pitch meetings.
              </p>
              <p className="text-gray-700">
                This anonymity ensures unbiased review, privacy during the discovery process, and gives investors full control over when and how they engage with founders.
              </p>
            </div>
          </section>

          {/* Market Opportunity */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-orange-600 mb-4">The Market</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-6 text-white text-center">
                <div className="text-4xl font-bold mb-2">$6.4T</div>
                <div className="text-sm">Global Startup Economy</div>
              </div>
              <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-6 text-white text-center">
                <div className="text-4xl font-bold mb-2">$25-30B</div>
                <div className="text-sm">Early-Stage Angel Investment Annually</div>
              </div>
              <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-6 text-white text-center">
                <div className="text-4xl font-bold mb-2">28%</div>
                <div className="text-sm">CAGR in Digital Investing Platforms</div>
              </div>
            </div>
            <p className="text-lg text-gray-700 leading-relaxed">
              Hot Honey is positioned as the <strong>social-trust layer for global venture capital</strong>—where credibility meets virality.
            </p>
          </section>

          {/* The Hot Economy Flywheel */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-orange-600 mb-6 text-center">The Hot Economy Flywheel</h2>
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-8">
              <img 
                src="/images/hot-economy-flywheel.png" 
                alt="The Hot Economy Flywheel" 
                className="w-full max-w-2xl mx-auto rounded-xl shadow-lg mb-6"
              />
              <p className="text-lg text-gray-700 leading-relaxed text-center italic">
                Every vote creates value. Every share fuels the loop. Every insight compounds the Hot Economy.
              </p>
              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4">
                  <h4 className="font-bold text-orange-600 mb-2">Outer Loop</h4>
                  <p className="text-gray-700 text-sm">
                    Investors → Startups → Data Engine → Partners → Revenue → Investors
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <h4 className="font-bold text-orange-600 mb-2">Inner Loop</h4>
                  <p className="text-gray-700 text-sm">
                    Curiosity → Engagement → Trust → Recognition → Influence
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-orange-600 mb-4">How It Works</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="text-4xl">🔍</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Discover</h3>
                  <p className="text-gray-700">
                    Swipe through curated StartupCards. Each card distills a startup into five key points: Problem, Solution, Market, Team, and Momentum. Make instinctive yes/no decisions based on curiosity.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="text-4xl">🔥</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Build Heat</h3>
                  <p className="text-gray-700">
                    Every "Yes" vote raises a startup's Heat Meter. High-heat startups appear in the Hot 5 Feed—the daily trending list that keeps investors coming back.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="text-4xl">🤝</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Connect</h3>
                  <p className="text-gray-700">
                    Verified investors unlock direct messaging, pitch sessions, and Deal Room access. Founders receive real-time feedback on who's interested and why.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="text-4xl">💰</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Invest Together</h3>
                  <p className="text-gray-700">
                    Form or join syndicates. Share Hot Lists. Co-invest with confidence. The platform makes group investment transparent, social, and fun.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Our Values */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold text-orange-600 mb-4">Our Values</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-orange-600 font-bold text-xl">✓</span>
                <div>
                  <strong className="text-gray-800">Human-Centered Design:</strong>
                  <span className="text-gray-700"> We believe emotion drives decisions. Data confirms them.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-600 font-bold text-xl">✓</span>
                <div>
                  <strong className="text-gray-800">Transparency:</strong>
                  <span className="text-gray-700"> Open, honest communication between startups and investors builds trust.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-600 font-bold text-xl">✓</span>
                <div>
                  <strong className="text-gray-800">Community-Driven:</strong>
                  <span className="text-gray-700"> Our voting system ensures the best startups rise to the top organically.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-600 font-bold text-xl">✓</span>
                <div>
                  <strong className="text-gray-800">Quality Over Quantity:</strong>
                  <span className="text-gray-700"> We curate deals so investors can focus on what truly matters.</span>
                </div>
              </li>
            </ul>
          </section>

          {/* Vision */}
          <section>
            <h2 className="text-3xl font-bold text-orange-600 mb-4">The Vision</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              Within five years, Hot Honey will become the <strong>global social layer for venture capital</strong>—a daily habit for investors and founders alike.
            </p>
            <div className="bg-gradient-to-r from-orange-400 to-orange-500 rounded-2xl p-6 text-white">
              <p className="text-xl font-semibold mb-3">
                We're not just building a platform. We're building a movement.
              </p>
              <p className="text-lg">
                Where chemistry precedes capital. Where trust is earned transparently. Where the best ideas win through collective validation.
              </p>
              <p className="text-2xl font-bold mt-4 text-center">
                The heat is rising. 🔥
              </p>
            </div>
          </section>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500 rounded-3xl p-8 shadow-2xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Join the Movement?</h2>
          <p className="text-xl text-white mb-6">
            Whether you're an investor seeking the next big thing or a startup ready to build momentum—Hot Honey is your platform.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="bg-white text-orange-600 font-bold py-4 px-8 rounded-2xl shadow-lg hover:bg-gray-100 transition-all text-lg"
            >
              🚀 Join Now
            </button>
            <button
              onClick={() => navigate('/vote')}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all text-lg"
            >
              🔥 Start Voting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}