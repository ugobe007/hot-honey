import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

// Define the type for a startup deal
type StartupDeal = {
  name: string
  valueProposition: string
  problem: string
  solution: string
  team: string[]
  raisingAmount: string
}

// Sample data for startup deals
const startupDeals: StartupDeal[] = [
  {
    name: "EcoTech Solutions",
    valueProposition: "Revolutionizing waste management with AI-powered recycling",
    problem: "Inefficient waste sorting leads to increased landfill usage",
    solution: "AI-powered waste sorting system for recycling centers",
    team: ["Google", "Tesla", "MIT"],
    raisingAmount: "$5 million"
  },
  {
    name: "HealthPal",
    valueProposition: "Personalized health monitoring and recommendations",
    problem: "Lack of continuous health tracking and personalized advice",
    solution: "Wearable device with AI-driven health insights",
    team: ["Apple", "Fitbit", "Stanford"],
    raisingAmount: "$8 million"
  },
  {
    name: "CyberShield",
    valueProposition: "Next-gen cybersecurity for small businesses",
    problem: "Small businesses lack affordable, effective cybersecurity solutions",
    solution: "AI-powered, cloud-based security platform",
    team: ["Microsoft", "Symantec", "Harvard"],
    raisingAmount: "$3.5 million"
  }
]

export default function HotMoney() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">pyth ai: Startup Deal Review</h1>
      <ScrollArea className="h-[calc(100vh-100px)]">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {startupDeals.map((deal, index) => (
            <Card key={index} className="flex flex-col">
              <CardHeader>
                <CardTitle>{deal.name}</CardTitle>
                <CardDescription>{deal.valueProposition}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-1">Problem:</h3>
                    <p>{deal.problem}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Solution:</h3>
                    <p>{deal.solution}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Team:</h3>
                    <div className="flex flex-wrap gap-2">
                      {deal.team.map((employer, i) => (
                        <Badge key={i} variant="secondary">{employer}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Raising:</h3>
                    <p className="text-lg font-bold text-green-600">{deal.raisingAmount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}