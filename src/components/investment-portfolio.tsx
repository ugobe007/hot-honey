{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import \{ useState \} from 'react'\
import \{ Card, CardContent, CardDescription, CardHeader, CardTitle \} from "@/components/ui/card"\
import \{ Button \} from "@/components/ui/button"\
import \{ Badge \} from "@/components/ui/badge"\
import \{ ScrollArea \} from "@/components/ui/scroll-area"\
import \{ Share2, ThumbsUp, Users \} from 'lucide-react'\
import \{ \
  Dialog,\
  DialogContent,\
  DialogDescription,\
  DialogHeader,\
  DialogTitle,\
  DialogTrigger,\
\} from "@/components/ui/dialog"\
\
type Startup = \{\
  id: string\
  name: string\
  description: string\
  votes: number\
\}\
\
type Portfolio = \{\
  id: string\
  name: string\
  startups: Startup[]\
\}\
\
export default function InvestorPortfolio() \{\
  const [portfolios, setPortfolios] = useState<Portfolio[]>([\
    \{\
      id: '1',\
      name: 'Tech Innovators',\
      startups: [\
        \{ id: '1', name: 'EcoTech Solutions', description: 'AI-powered recycling', votes: 3 \},\
        \{ id: '2', name: 'HealthPal', description: 'Personalized health monitoring', votes: 4 \},\
      ]\
    \},\
    \{\
      id: '2',\
      name: 'Future Unicorns',\
      startups: [\
        \{ id: '3', name: 'CyberShield', description: 'Cybersecurity for small businesses', votes: 2 \},\
        \{ id: '4', name: 'SpaceX Junior', description: 'Affordable space tourism', votes: 5 \},\
      ]\
    \}\
  ])\
\
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null)\
\
  const handleShare = (portfolio: Portfolio) => \{\
    // In a real app, this would open a share dialog or generate a shareable link\
    console.log(`Sharing portfolio: $\{portfolio.name\}`)\
    alert(`Sharing portfolio: $\{portfolio.name\} on social media`)\
  \}\
\
  const handleFriendVote = (portfolioId: string, startupId: string) => \{\
    setPortfolios(prevPortfolios => \
      prevPortfolios.map(portfolio => \
        portfolio.id === portfolioId\
          ? \{\
              ...portfolio,\
              startups: portfolio.startups.map(startup => \
                startup.id === startupId\
                  ? \{ ...startup, votes: startup.votes + 1 \}\
                  : startup\
              )\
            \}\
          : portfolio\
      )\
    )\
  \}\
\
  const handleCreateSyndicate = (startup: Startup) => \{\
    // In a real app, this would initiate the syndicate creation process\
    console.log(`Creating syndicate for: $\{startup.name\}`)\
    alert(`Syndicate created for $\{startup.name\}. You can now invite other investors!`)\
  \}\
\
  return (\
    <div className="container mx-auto p-4">\
      <h1 className="text-3xl font-bold mb-6 text-center">Investor Portfolios</h1>\
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">\
        \{portfolios.map(portfolio => (\
          <Card key=\{portfolio.id\}>\
            <CardHeader>\
              <CardTitle>\{portfolio.name\}</CardTitle>\
              <CardDescription>\
                \{portfolio.startups.length\} startups in this portfolio\
              </CardDescription>\
            </CardHeader>\
            <CardContent>\
              <ScrollArea className="h-[200px] w-full rounded-md border p-4">\
                \{portfolio.startups.map(startup => (\
                  <div key=\{startup.id\} className="mb-4 p-2 border rounded-lg">\
                    <div className="flex justify-between items-center mb-2">\
                      <h3 className="text-lg font-semibold">\{startup.name\}</h3>\
                      <Badge variant="secondary">\{startup.votes\} votes</Badge>\
                    </div>\
                    <p className="text-sm text-gray-600 mb-2">\{startup.description\}</p>\
                    <div className="flex justify-between items-center">\
                      <Button \
                        size="sm" \
                        variant="outline"\
                        onClick=\{() => handleFriendVote(portfolio.id, startup.id)\}\
                      >\
                        <ThumbsUp className="w-4 h-4 mr-2" />\
                        Vote\
                      </Button>\
                      \{startup.votes >= 5 && (\
                        <Button \
                          size="sm"\
                          onClick=\{() => handleCreateSyndicate(startup)\}\
                        >\
                          <Users className="w-4 h-4 mr-2" />\
                          Create Syndicate\
                        </Button>\
                      )\}\
                    </div>\
                  </div>\
                ))\}\
              </ScrollArea>\
              <Button \
                className="w-full mt-4" \
                onClick=\{() => handleShare(portfolio)\}\
              >\
                <Share2 className="w-4 h-4 mr-2" />\
                Share Portfolio\
              </Button>\
            </CardContent>\
          </Card>\
        ))\}\
      </div>\
\
      <Dialog>\
        <DialogTrigger asChild>\
          <Button className="mt-6">Create New Portfolio</Button>\
        </DialogTrigger>\
        <DialogContent className="sm:max-w-[425px]">\
          <DialogHeader>\
            <DialogTitle>Create New Portfolio</DialogTitle>\
            <DialogDescription>\
              Give your new portfolio a name and start adding startups!\
            </DialogDescription>\
          </DialogHeader>\
          \{/* Add form fields for creating a new portfolio here */\}\
        </DialogContent>\
      </Dialog>\
    </div>\
  )\
\}}