{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import \{ useState, useEffect \} from 'react'\
import \{ Card, CardContent, CardDescription, CardHeader, CardTitle \} from "@/components/ui/card"\
import \{ Badge \} from "@/components/ui/badge"\
import \{ Button \} from "@/components/ui/button"\
import \{ ArrowRight \} from 'lucide-react'\
\
type Startup = \{\
  id: string\
  name: string\
  description: string\
  category: string\
  raisingAmount: string\
\}\
\
const startups: Startup[] = [\
  \{ id: '1', name: 'EcoTech Solutions', description: 'AI-powered recycling', category: 'Cleantech', raisingAmount: '$5M' \},\
  \{ id: '2', name: 'HealthPal', description: 'Personalized health monitoring', category: 'Healthtech', raisingAmount: '$8M' \},\
  \{ id: '3', name: 'CyberShield', description: 'Cybersecurity for small businesses', category: 'Fintech', raisingAmount: '$3.5M' \},\
  \{ id: '4', name: 'SpaceX Junior', description: 'Affordable space tourism', category: 'AI', raisingAmount: '$20M' \},\
  \{ id: '5', name: 'GreenEnergy', description: 'Renewable energy solutions', category: 'Cleantech', raisingAmount: '$10M' \},\
  \{ id: '6', name: 'FinanceAI', description: 'AI-driven financial planning', category: 'Fintech', raisingAmount: '$7M' \},\
]\
\
export default function FrontPage() \{\
  const [currentStartups, setCurrentStartups] = useState<Startup[]>(startups.slice(0, 3))\
\
  useEffect(() => \{\
    const interval = setInterval(() => \{\
      setCurrentStartups(prevStartups => \{\
        const nextStartups = startups.filter(startup => !prevStartups.includes(startup))\
        return nextStartups.slice(0, 3)\
      \})\
    \}, 15000)\
\
    return () => clearInterval(interval)\
  \}, [])\
\
  return (\
    <div className="container mx-auto p-4">\
      <h1 className="text-4xl font-bold mb-8 text-center">Hot Money: Discover Promising Startups</h1>\
      <div className="grid gap-6 md:grid-cols-3">\
        \{currentStartups.map(startup => (\
          <Card key=\{startup.id\} className="transition-all duration-500 ease-in-out hover:shadow-lg">\
            <CardHeader>\
              <CardTitle>\{startup.name\}</CardTitle>\
              <CardDescription>\{startup.description\}</CardDescription>\
            </CardHeader>\
            <CardContent>\
              <div className="flex justify-between items-center mb-4">\
                <Badge>\{startup.category\}</Badge>\
                <span className="font-bold text-green-600">\{startup.raisingAmount\}</span>\
              </div>\
              <Button className="w-full">\
                Learn More\
                <ArrowRight className="w-4 h-4 ml-2" />\
              </Button>\
            </CardContent>\
          </Card>\
        ))\}\
      </div>\
      <div className="mt-8 text-center">\
        <Button size="lg">\
          View All Startups\
          <ArrowRight className="w-4 h-4 ml-2" />\
        </Button>\
      </div>\
    </div>\
  )\
\}}