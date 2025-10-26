{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import \{ useState \} from 'react'\
import \{ Card, CardContent, CardDescription, CardHeader, CardTitle \} from "@/components/ui/card"\
import \{ Button \} from "@/components/ui/button"\
import \{ Input \} from "@/components/ui/input"\
import \{ Label \} from "@/components/ui/label"\
import \{ ScrollArea \} from "@/components/ui/scroll-area"\
import \{ Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger \} from "@/components/ui/dialog"\
import \{ Avatar, AvatarFallback, AvatarImage \} from "@/components/ui/avatar"\
import \{ Badge \} from "@/components/ui/badge"\
import \{ Users, UserPlus, Eye, EyeOff, Lock, Unlock \} from 'lucide-react'\
\
type Investor = \{\
  id: string\
  name: string\
  avatar: string\
  isRevealed: boolean\
\}\
\
type InvestmentClub = \{\
  id: string\
  name: string\
  description: string\
  members: Investor[]\
  investedStartups: string[]\
\}\
\
export default function InvestmentClub() \{\
  const [clubs, setClubs] = useState<InvestmentClub[]>([\
    \{\
      id: '1',\
      name: 'Tech Visionaries',\
      description: 'Focusing on cutting-edge technology startups',\
      members: [\
        \{ id: '1', name: 'Investor A', avatar: '/placeholder.svg', isRevealed: false \},\
        \{ id: '2', name: 'Investor B', avatar: '/placeholder.svg', isRevealed: true \},\
      ],\
      investedStartups: ['EcoTech Solutions', 'HealthPal']\
    \},\
    \{\
      id: '2',\
      name: 'Green Future Fund',\
      description: 'Investing in sustainable and eco-friendly startups',\
      members: [\
        \{ id: '3', name: 'Investor C', avatar: '/placeholder.svg', isRevealed: false \},\
        \{ id: '4', name: 'Investor D', avatar: '/placeholder.svg', isRevealed: false \},\
      ],\
      investedStartups: ['GreenEnergy']\
    \}\
  ])\
\
  const [newClub, setNewClub] = useState<Partial<InvestmentClub>>(\{\
    name: '',\
    description: '',\
    members: [],\
    investedStartups: []\
  \})\
\
  const handleCreateClub = () => \{\
    if (newClub.name && newClub.description) \{\
      setClubs(prevClubs => [\
        ...prevClubs,\
        \{\
          id: (prevClubs.length + 1).toString(),\
          name: newClub.name,\
          description: newClub.description,\
          members: [],\
          investedStartups: []\
        \}\
      ])\
      setNewClub(\{ name: '', description: '', members: [], investedStartups: [] \})\
    \}\
  \}\
\
  const handleToggleReveal = (clubId: string, investorId: string) => \{\
    setClubs(prevClubs => \
      prevClubs.map(club => \
        club.id === clubId\
          ? \{\
              ...club,\
              members: club.members.map(member => \
                member.id === investorId\
                  ? \{ ...member, isRevealed: !member.isRevealed \}\
                  : member\
              )\
            \}\
          : club\
      )\
    )\
  \}\
\
  const handleAddMember = (clubId: string, memberName: string) => \{\
    setClubs(prevClubs => \
      prevClubs.map(club => \
        club.id === clubId\
          ? \{\
              ...club,\
              members: [\
                ...club.members,\
                \{ id: (club.members.length + 1).toString(), name: memberName, avatar: '/placeholder.svg', isRevealed: false \}\
              ]\
            \}\
          : club\
      )\
    )\
  \}\
\
  return (\
    <div className="container mx-auto p-4">\
      <h1 className="text-3xl font-bold mb-6 text-center">Investment Clubs</h1>\
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">\
        \{clubs.map(club => (\
          <Card key=\{club.id\}>\
            <CardHeader>\
              <CardTitle>\{club.name\}</CardTitle>\
              <CardDescription>\{club.description\}</CardDescription>\
            </CardHeader>\
            <CardContent>\
              <div className="space-y-4">\
                <div>\
                  <h3 className="font-semibold mb-2 flex items-center">\
                    <Users className="w-4 h-4 mr-2" />\
                    Members\
                  </h3>\
                  <ScrollArea className="h-[100px] w-full rounded-md border p-2">\
                    \{club.members.map(member => (\
                      <div key=\{member.id\} className="flex items-center justify-between mb-2">\
                        <div className="flex items-center">\
                          <Avatar className="h-8 w-8 mr-2">\
                            <AvatarImage src=\{member.avatar\} alt=\{member.name\} />\
                            <AvatarFallback>\{member.name[0]\}</AvatarFallback>\
                          </Avatar>\
                          <span>\{member.isRevealed ? member.name : 'Anonymous Investor'\}</span>\
                        </div>\
                        <Button\
                          variant="ghost"\
                          size="sm"\
                          onClick=\{() => handleToggleReveal(club.id, member.id)\}\
                        >\
                          \{member.isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />\}\
                        </Button>\
                      </div>\
                    ))\}\
                  </ScrollArea>\
                </div>\
                <div>\
                  <h3 className="font-semibold mb-2">Invested Startups</h3>\
                  <div className="flex flex-wrap gap-2">\
                    \{club.investedStartups.map((startup, index) => (\
                      <Badge key=\{index\} variant="secondary">\{startup\}</Badge>\
                    ))\}\
                  </div>\
                </div>\
                <Dialog>\
                  <DialogTrigger asChild>\
                    <Button variant="outline" className="w-full">\
                      <UserPlus className="w-4 h-4 mr-2" />\
                      Add Member\
                    </Button>\
                  </DialogTrigger>\
                  <DialogContent>\
                    <DialogHeader>\
                      <DialogTitle>Add New Member</DialogTitle>\
                      <DialogDescription>\
                        Enter the name of the investor you want to add to this club.\
                      </DialogDescription>\
                    </DialogHeader>\
                    <div className="space-y-4 py-4">\
                      <div className="space-y-2">\
                        <Label htmlFor="member-name">Investor Name</Label>\
                        <Input \
                          id="member-name" \
                          placeholder="Enter investor name"\
                          onKeyPress=\{(e) => \{\
                            if (e.key === 'Enter') \{\
                              handleAddMember(club.id, e.currentTarget.value)\
                              e.currentTarget.value = ''\
                            \}\
                          \}\}\
                        />\
                      </div>\
                    </div>\
                  </DialogContent>\
                </Dialog>\
              </div>\
            </CardContent>\
          </Card>\
        ))\}\
        <Card>\
          <CardHeader>\
            <CardTitle>Create New Investment Club</CardTitle>\
            <CardDescription>Start a new club with fellow investors</CardDescription>\
          </CardHeader>\
          <CardContent>\
            <form className="space-y-4">\
              <div className="space-y-2">\
                <Label htmlFor="club-name">Club Name</Label>\
                <Input \
                  id="club-name" \
                  value=\{newClub.name\} \
                  onChange=\{(e) => setNewClub(prev => (\{ ...prev, name: e.target.value \}))\}\
                  placeholder="Enter club name" \
                />\
              </div>\
              <div className="space-y-2">\
                <Label htmlFor="club-description">Description</Label>\
                <Input \
                  id="club-description" \
                  value=\{newClub.description\} \
                  onChange=\{(e) => setNewClub(prev => (\{ ...prev, description: e.target.value \}))\}\
                  placeholder="Describe the club's investment focus" \
                />\
              </div>\
              <Button onClick=\{handleCreateClub\} className="w-full">\
                <Lock className="w-4 h-4 mr-2" />\
                Create Investment Club\
              </Button>\
            </form>\
          </CardContent>\
        </Card>\
      </div>\
    </div>\
  )\
\}}