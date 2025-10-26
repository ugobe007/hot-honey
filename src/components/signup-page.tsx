{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 'use client'\
\
import \{ useState \} from 'react'\
import \{ Card, CardContent, CardDescription, CardHeader, CardTitle \} from "@/components/ui/card"\
import \{ Tabs, TabsContent, TabsList, TabsTrigger \} from "@/components/ui/tabs"\
import \{ Input \} from "@/components/ui/input"\
import \{ Label \} from "@/components/ui/label"\
import \{ Button \} from "@/components/ui/button"\
import \{ Textarea \} from "@/components/ui/textarea"\
import \{ ScrollArea \} from "@/components/ui/scroll-area"\
import \{ FileUploader \} from "@/components/ui/file-uploader"\
\
type UserType = 'startup' | 'investor'\
type StartupProfile = \{\
  name: string\
  description: string\
  documents: string[]\
\}\
\
export default function SignUpPage() \{\
  const [userType, setUserType] = useState<UserType>('startup')\
  const [startupProfiles, setStartupProfiles] = useState<StartupProfile[]>([])\
  const [votedStartups, setVotedStartups] = useState<string[]>([])\
\
  const handleSignUp = (event: React.FormEvent<HTMLFormElement>) => \{\
    event.preventDefault()\
    // Handle sign-up logic here\
    console.log('Sign up submitted for', userType)\
  \}\
\
  const handleFileUpload = (files: FileList | null) => \{\
    if (files) \{\
      // Handle file upload logic here\
      console.log('Files uploaded:', files)\
    \}\
  \}\
\
  const handleVote = (startupName: string) => \{\
    setVotedStartups(prev => [...prev, startupName])\
  \}\
\
  // Mock data for startup profiles\
  const mockStartupProfiles: StartupProfile[] = [\
    \{ name: 'EcoTech Solutions', description: 'AI-powered recycling', documents: ['business_plan.pdf', 'pitch_deck.pptx'] \},\
    \{ name: 'HealthPal', description: 'Personalized health monitoring', documents: ['financial_projections.xlsx'] \},\
    \{ name: 'CyberShield', description: 'Cybersecurity for small businesses', documents: ['team_bios.pdf', 'market_analysis.pdf'] \},\
  ]\
\
  return (\
    <div className="container mx-auto p-4">\
      <h1 className="text-3xl font-bold mb-6 text-center">Hot Money: Sign Up</h1>\
      <Tabs defaultValue="startup" className="max-w-3xl mx-auto">\
        <TabsList className="grid w-full grid-cols-2">\
          <TabsTrigger value="startup" onClick=\{() => setUserType('startup')\}>Startup</TabsTrigger>\
          <TabsTrigger value="investor" onClick=\{() => setUserType('investor')\}>Investor</TabsTrigger>\
        </TabsList>\
        <TabsContent value="startup">\
          <Card>\
            <CardHeader>\
              <CardTitle>Startup Sign Up</CardTitle>\
              <CardDescription>Create your startup profile and upload documents</CardDescription>\
            </CardHeader>\
            <CardContent>\
              <form onSubmit=\{handleSignUp\} className="space-y-4">\
                <div className="space-y-2">\
                  <Label htmlFor="startup-name">Startup Name</Label>\
                  <Input id="startup-name" placeholder="Enter your startup name" required />\
                </div>\
                <div className="space-y-2">\
                  <Label htmlFor="startup-email">Email</Label>\
                  <Input id="startup-email" type="email" placeholder="Enter your email" required />\
                </div>\
                <div className="space-y-2">\
                  <Label htmlFor="startup-password">Password</Label>\
                  <Input id="startup-password" type="password" placeholder="Create a password" required />\
                </div>\
                <div className="space-y-2">\
                  <Label htmlFor="startup-description">Description</Label>\
                  <Textarea id="startup-description" placeholder="Describe your startup" />\
                </div>\
                <div className="space-y-2">\
                  <Label>Upload Documents</Label>\
                  <FileUploader onFilesSelected=\{handleFileUpload\} />\
                </div>\
                <Button type="submit" className="w-full">Sign Up as Startup</Button>\
              </form>\
            </CardContent>\
          </Card>\
        </TabsContent>\
        <TabsContent value="investor">\
          <Card>\
            <CardHeader>\
              <CardTitle>Investor Sign Up</CardTitle>\
              <CardDescription>Create your investor profile and review startups</CardDescription>\
            </CardHeader>\
            <CardContent>\
              <form onSubmit=\{handleSignUp\} className="space-y-4">\
                <div className="space-y-2">\
                  <Label htmlFor="investor-name">Full Name</Label>\
                  <Input id="investor-name" placeholder="Enter your full name" required />\
                </div>\
                <div className="space-y-2">\
                  <Label htmlFor="investor-email">Email</Label>\
                  <Input id="investor-email" type="email" placeholder="Enter your email" required />\
                </div>\
                <div className="space-y-2">\
                  <Label htmlFor="investor-password">Password</Label>\
                  <Input id="investor-password" type="password" placeholder="Create a password" required />\
                </div>\
                <Button type="submit" className="w-full">Sign Up as Investor</Button>\
              </form>\
            </CardContent>\
          </Card>\
          <Card className="mt-6">\
            <CardHeader>\
              <CardTitle>Voted Startup Profiles</CardTitle>\
              <CardDescription>Review profiles of startups you've voted "Yes" for</CardDescription>\
            </CardHeader>\
            <CardContent>\
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">\
                \{mockStartupProfiles.map((profile, index) => (\
                  <div key=\{index\} className="mb-4 p-4 border rounded-lg">\
                    <h3 className="text-lg font-semibold">\{profile.name\}</h3>\
                    <p className="text-sm text-gray-600 mb-2">\{profile.description\}</p>\
                    <div className="space-y-2">\
                      <h4 className="text-sm font-medium">Documents:</h4>\
                      <ul className="list-disc list-inside text-sm">\
                        \{profile.documents.map((doc, docIndex) => (\
                          <li key=\{docIndex\}>\{doc\}</li>\
                        ))\}\
                      </ul>\
                    </div>\
                    \{!votedStartups.includes(profile.name) && (\
                      <Button \
                        onClick=\{() => handleVote(profile.name)\} \
                        className="mt-2" \
                        variant="outline"\
                      >\
                        Vote Yes\
                      </Button>\
                    )\}\
                  </div>\
                ))\}\
              </ScrollArea>\
            </CardContent>\
          </Card>\
        </TabsContent>\
      </Tabs>\
    </div>\
  )\
\}}