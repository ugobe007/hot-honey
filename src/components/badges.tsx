{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import \{ useState \} from 'react'\
import \{ Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter \} from "@/components/ui/card"\
import \{ Badge \} from "@/components/ui/badge"\
import \{ Button \} from "@/components/ui/button"\
import \{ ScrollArea \} from "@/components/ui/scroll-area"\
import \{ ThumbsUp, ThumbsDown, Flame \} from 'lucide-react'\
\
type StartupDeal = \{\
  id: string\
  name: string\
  valueProposition: string\
  problem: string\
  solution: string\
  team: string[]\
  raisingAmount: string\
\}\
\
type Vote = \{\
  yes: number\
  no: number\
\}\
\
const startupDeals: StartupDeal[] = [\
  \{\
    id: "1",\
    name: "EcoTech Solutions",\
    valueProposition: "Revolutionizing waste management with AI-powered recycling",\
    problem: "Inefficient waste sorting leads to increased landfill usage",\
    solution: "AI-powered waste sorting system for recycling centers",\
    team: ["Google", "Tesla", "MIT"],\
    raisingAmount: "$5 million"\
  \},\
  \{\
    id: "2",\
    name: "HealthPal",\
    valueProposition: "Personalized health monitoring and recommendations",\
    problem: "Lack of continuous health tracking and personalized advice",\
    solution: "Wearable device with AI-driven health insights",\
    team: ["Apple", "Fitbit", "Stanford"],\
    raisingAmount: "$8 million"\
  \},\
  \{\
    id: "3",\
    name: "CyberShield",\
    valueProposition: "Next-gen cybersecurity for small businesses",\
    problem: "Small businesses lack affordable, effective cybersecurity solutions",\
    solution: "AI-powered, cloud-based security platform",\
    team: ["Microsoft", "Symantec", "Harvard"],\
    raisingAmount: "$3.5 million"\
  \}\
]\
\
export default function HotMoney() \{\
  const [votes, setVotes] = useState<Record<string, Vote>>(\{\})\
\
  const handleVote = (id: string, voteType: 'yes' | 'no') => \{\
    setVotes(prevVotes => (\{\
      ...prevVotes,\
      [id]: \{\
        yes: prevVotes[id]?.yes || 0,\
        no: prevVotes[id]?.no || 0,\
        [voteType]: (prevVotes[id]?.[voteType] || 0) + 1\
      \}\
    \}))\
  \}\
\
  const isHotMoney = (id: string) => (votes[id]?.yes || 0) >= 5\
\
  return (\
    <div className="container mx-auto p-4">\
      <h1 className="text-3xl font-bold mb-6 text-center">Hot Money: Startup Deal Review</h1>\
      <ScrollArea className="h-[calc(100vh-100px)]">\
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">\
          \{startupDeals.map((deal) => (\
            <Card key=\{deal.id\} className="flex flex-col">\
              <CardHeader>\
                <div className="flex justify-between items-center">\
                  <CardTitle>\{deal.name\}</CardTitle>\
                  \{isHotMoney(deal.id) && (\
                    <Badge variant="outline" className="bg-orange-100 text-orange-500 border-orange-500 flex items-center gap-1">\
                      <Flame className="w-4 h-4" />\
                      Hot Money\
                    </Badge>\
                  )\}\
                </div>\
                <CardDescription>\{deal.valueProposition\}</CardDescription>\
              </CardHeader>\
              <CardContent className="flex-grow">\
                <div className="space-y-4">\
                  <div>\
                    <h3 className="font-semibold mb-1">Problem:</h3>\
                    <p>\{deal.problem\}</p>\
                  </div>\
                  <div>\
                    <h3 className="font-semibold mb-1">Solution:</h3>\
                    <p>\{deal.solution\}</p>\
                  </div>\
                  <div>\
                    <h3 className="font-semibold mb-1">Team:</h3>\
                    <div className="flex flex-wrap gap-2">\
                      \{deal.team.map((employer, i) => (\
                        <Badge key=\{i\} variant="secondary">\{employer\}</Badge>\
                      ))\}\
                    </div>\
                  </div>\
                  <div>\
                    <h3 className="font-semibold mb-1">Raising:</h3>\
                    <p className="text-lg font-bold text-green-600">\{deal.raisingAmount\}</p>\
                  </div>\
                </div>\
              </CardContent>\
              <CardFooter className="flex justify-between items-center">\
                <Button \
                  variant="outline" \
                  onClick=\{() => handleVote(deal.id, 'yes')\}\
                  className="flex items-center gap-2"\
                >\
                  <ThumbsUp className="w-4 h-4" />\
                  Yes (\{votes[deal.id]?.yes || 0\})\
                </Button>\
                <Button \
                  variant="outline" \
                  onClick=\{() => handleVote(deal.id, 'no')\}\
                  className="flex items-center gap-2"\
                >\
                  <ThumbsDown className="w-4 h-4" />\
                  No (\{votes[deal.id]?.no || 0\})\
                </Button>\
              </CardFooter>\
            </Card>\
          ))\}\
        </div>\
      </ScrollArea>\
    </div>\
  )\
\}}