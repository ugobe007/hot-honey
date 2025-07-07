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
import \{ Textarea \} from "@/components/ui/textarea"\
import \{ ScrollArea \} from "@/components/ui/scroll-area"\
import \{ Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger \} from "@/components/ui/dialog"\
import \{ FileUploader \} from "@/components/ui/file-uploader"\
import \{ Plus, Users, MessageSquare, FileText, Lock \} from 'lucide-react'\
\
type DealRoom = \{\
  id: string\
  name: string\
  description: string\
  documents: string[]\
  investors: string[]\
\}\
\
export default function StartupDealRoom() \{\
  const [dealRooms, setDealRooms] = useState<DealRoom[]>([\
    \{\
      id: '1',\
      name: 'Series A Funding',\
      description: 'Confidential information for our upcoming Series A round',\
      documents: ['pitch_deck.pdf', 'financial_projections.xlsx'],\
      investors: ['John Doe', 'Jane Smith']\
    \},\
    \{\
      id: '2',\
      name: 'Strategic Partnership',\
      description: 'Details about our proposed strategic partnership',\
      documents: ['partnership_proposal.pdf', 'market_analysis.pptx'],\
      investors: ['Alice Johnson', 'Bob Williams']\
    \}\
  ])\
\
  const [newDealRoom, setNewDealRoom] = useState<Partial<DealRoom>>(\{\
    name: '',\
    description: '',\
    documents: [],\
    investors: []\
  \})\
\
  const handleCreateDealRoom = () => \{\
    if (newDealRoom.name && newDealRoom.description) \{\
      setDealRooms(prevRooms => [\
        ...prevRooms,\
        \{\
          id: (prevRooms.length + 1).toString(),\
          name: newDealRoom.name,\
          description: newDealRoom.description,\
          documents: newDealRoom.documents || [],\
          investors: newDealRoom.investors || []\
        \}\
      ])\
      setNewDealRoom(\{ name: '', description: '', documents: [], investors: [] \})\
    \}\
  \}\
\
  const handleFileUpload = (files: File[]) => \{\
    setNewDealRoom(prev => (\{\
      ...prev,\
      documents: [...(prev.documents || []), ...files.map(f => f.name)]\
    \}))\
  \}\
\
  const handleAddInvestor = (dealRoomId: string, investorName: string) => \{\
    setDealRooms(prevRooms => \
      prevRooms.map(room => \
        room.id === dealRoomId\
          ? \{ ...room, investors: [...room.investors, investorName] \}\
          : room\
      )\
    )\
  \}\
\
  return (\
    <div className="container mx-auto p-4">\
      <h1 className="text-3xl font-bold mb-6 text-center">Startup Deal Rooms</h1>\
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">\
        \{dealRooms.map(room => (\
          <Card key=\{room.id\}>\
            <CardHeader>\
              <CardTitle>\{room.name\}</CardTitle>\
              <CardDescription>\{room.description\}</CardDescription>\
            </CardHeader>\
            <CardContent>\
              <div className="space-y-4">\
                <div>\
                  <h3 className="font-semibold mb-2 flex items-center">\
                    <FileText className="w-4 h-4 mr-2" />\
                    Documents\
                  </h3>\
                  <ScrollArea className="h-[100px] w-full rounded-md border p-2">\
                    <ul className="space-y-1">\
                      \{room.documents.map((doc, index) => (\
                        <li key=\{index\} className="text-sm">\{doc\}</li>\
                      ))\}\
                    </ul>\
                  </ScrollArea>\
                </div>\
                <div>\
                  <h3 className="font-semibold mb-2 flex items-center">\
                    <Users className="w-4 h-4 mr-2" />\
                    Invited Investors\
                  </h3>\
                  <ScrollArea className="h-[100px] w-full rounded-md border p-2">\
                    <ul className="space-y-1">\
                      \{room.investors.map((investor, index) => (\
                        <li key=\{index\} className="text-sm">\{investor\}</li>\
                      ))\}\
                    </ul>\
                  </ScrollArea>\
                </div>\
                <Dialog>\
                  <DialogTrigger asChild>\
                    <Button variant="outline" className="w-full">\
                      <Plus className="w-4 h-4 mr-2" />\
                      Invite Investor\
                    </Button>\
                  </DialogTrigger>\
                  <DialogContent>\
                    <DialogHeader>\
                      <DialogTitle>Invite Investor</DialogTitle>\
                      <DialogDescription>\
                        Enter the name of the investor you want to invite to this deal room.\
                      </DialogDescription>\
                    </DialogHeader>\
                    <div className="space-y-4 py-4">\
                      <div className="space-y-2">\
                        <Label htmlFor="investor-name">Investor Name</Label>\
                        <Input \
                          id="investor-name" \
                          placeholder="Enter investor name"\
                          onKeyPress=\{(e) => \{\
                            if (e.key === 'Enter') \{\
                              handleAddInvestor(room.id, e.currentTarget.value)\
                              e.currentTarget.value = ''\
                            \}\
                          \}\}\
                        />\
                      </div>\
                    </div>\
                  </DialogContent>\
                </Dialog>\
                <Button variant="secondary" className="w-full">\
                  <MessageSquare className="w-4 h-4 mr-2" />\
                  Open Chat\
                </Button>\
              </div>\
            </CardContent>\
          </Card>\
        ))\}\
        <Card>\
          <CardHeader>\
            <CardTitle>Create New Deal Room</CardTitle>\
            <CardDescription>Set up a new confidential space for investors</CardDescription>\
          </CardHeader>\
          <CardContent>\
            <form className="space-y-4">\
              <div className="space-y-2">\
                <Label htmlFor="room-name">Deal Room Name</Label>\
                <Input \
                  id="room-name" \
                  value=\{newDealRoom.name\} \
                  onChange=\{(e) => setNewDealRoom(prev => (\{ ...prev, name: e.target.value \}))\}\
                  placeholder="Enter deal room name" \
                />\
              </div>\
              <div className="space-y-2">\
                <Label htmlFor="room-description">Description</Label>\
                <Textarea \
                  id="room-description" \
                  value=\{newDealRoom.description\} \
                  onChange=\{(e) => setNewDealRoom(prev => (\{ ...prev, description: e.target.value \}))\}\
                  placeholder="Describe the purpose of this deal room" \
                />\
              </div>\
              <div className="space-y-2">\
                <Label>Upload Documents</Label>\
                <FileUploader onFilesSelected=\{handleFileUpload\} />\
              </div>\
              <Button onClick=\{handleCreateDealRoom\} className="w-full">\
                <Lock className="w-4 h-4 mr-2" />\
                Create Deal Room\
              </Button>\
            </form>\
          </CardContent>\
        </Card>\
      </div>\
    </div>\
  )\
\}}